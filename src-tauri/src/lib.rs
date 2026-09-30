use std::sync::OnceLock;

use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Emitter, Manager};
use tokio::io::AsyncWriteExt;

const DOWNLOAD_EVENT: &str = "download://progress";
const PROGRESS_STEP: u64 = 512 * 1024;

const REFERER: &str = "https://www.bilibili.com";
const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
/// 单次返回的最大字节数。播放器请求 `bytes=0-` 这类开区间时不至于把整个文件读进内存，
/// 返回 206 + 实际 Content-Range 后浏览器会继续请求下一段。
const MAX_CHUNK: u64 = 4 * 1024 * 1024;
/// 放行 https 的公开主机；只拦内网/回环地址，避免这个协议被用来探测本机或局域网。
/// B 站的 PCDN 节点域名（mountaintoys.cn / mcdn.bilivideo.cn / szbdyd.com 等）会不断轮换，
/// 用固定白名单迟早会漏，所以这里改成"默认放行、排除私网"。
fn is_private_ip(ip: std::net::IpAddr) -> bool {
    match ip {
        std::net::IpAddr::V4(v4) => {
            v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_unspecified()
                || v4.is_broadcast()
                || v4.octets()[0] == 0
        }
        std::net::IpAddr::V6(v6) => {
            // ::ffff:127.0.0.1 这类 IPv4 映射/兼容地址要按 v4 规则判断
            if let Some(v4) = v6.to_ipv4() {
                return is_private_ip(std::net::IpAddr::V4(v4));
            }
            v6.is_loopback() || v6.is_unspecified() || (v6.segments()[0] & 0xfe00) == 0xfc00
        }
    }
}

fn host_allowed(target: &str) -> bool {
    let Some(rest) = target.strip_prefix("https://") else {
        return false;
    };
    let authority = rest.split(['/', '?', '#']).next().unwrap_or("");
    let bare = authority.rsplit('@').next().unwrap_or(authority);
    // IPv6 字面量带方括号且含冒号，不能按冒号切端口
    let host = match bare.find(']') {
        Some(end) => &bare[..=end],
        None => bare.split(':').next().unwrap_or(""),
    };
    if host.is_empty() {
        return false;
    }

    let lower = host.to_ascii_lowercase();
    if lower == "localhost" || lower.ends_with(".local") || lower.ends_with(".internal") {
        return false;
    }

    // IPv6 字面量形如 [::1]，要先去掉方括号再判断
    let bare = lower
        .strip_prefix('[')
        .and_then(|value| value.strip_suffix(']'))
        .unwrap_or(&lower);

    match bare.parse::<std::net::IpAddr>() {
        Ok(ip) => !is_private_ip(ip),
        Err(_) => true,
    }
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .build()
            .expect("failed to build stream client")
    })
}

fn clamp_range(value: &str) -> Option<String> {
    let spec = value.strip_prefix("bytes=")?;
    let (start, end) = spec.split_once('-')?;
    let start: u64 = start.trim().parse().ok()?;
    let limit = start.saturating_add(MAX_CHUNK - 1);
    let end = match end.trim() {
        "" => limit,
        other => other.parse::<u64>().ok()?.min(limit),
    };
    if end < start {
        return None;
    }
    Some(format!("bytes={start}-{end}"))
}

async fn proxy(request: Request<Vec<u8>>) -> Result<Response<Vec<u8>>, String> {
    let encoded = request.uri().path().trim_start_matches('/');
    let target = percent_encoding::percent_decode_str(encoded)
        .decode_utf8()
        .map_err(|_| "非法的编码路径".to_string())?
        .to_string();

    if !host_allowed(&target) {
        let host = target
            .trim_start_matches("https://")
            .split(['/', '?', '#'])
            .next()
            .unwrap_or("");
        eprintln!("[bilistream] 拒绝转发 {host}");
        return Err(format!("不允许的源地址: {host}"));
    }

    let range = request
        .headers()
        .get(header::RANGE)
        .and_then(|value| value.to_str().ok())
        .and_then(clamp_range)
        .unwrap_or_else(|| format!("bytes=0-{}", MAX_CHUNK - 1));

    let response = client()
        .get(&target)
        .header(header::REFERER, REFERER)
        .header(header::ORIGIN, REFERER)
        .header(header::USER_AGENT, USER_AGENT)
        .header(header::RANGE, range)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    let status = response.status();
    let mut builder = Response::builder().status(status);
    for name in [
        header::CONTENT_TYPE,
        header::CONTENT_LENGTH,
        header::CONTENT_RANGE,
        header::ACCEPT_RANGES,
    ] {
        if let Some(value) = response.headers().get(&name) {
            builder = builder.header(name, value);
        }
    }

    let body = response.bytes().await.map_err(|error| error.to_string())?;
    builder
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCEPT_RANGES, "bytes")
        .body(body.to_vec())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    id: String,
    received: u64,
    total: u64,
    done: bool,
}

/// 去掉文件名里非法字符，避免写到 Downloads 之外
fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 0x20 => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').trim().to_string();
    if trimmed.is_empty() {
        "bili-cat-media".to_string()
    } else {
        trimmed
    }
}

/// 末段如果是 1~5 位字母数字才算扩展名，避免把 `3.14` 这种当后缀
fn extension_of(value: &str) -> Option<&str> {
    let (_, ext) = value.rsplit_once('.')?;
    if (1..=5).contains(&ext.len()) && ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        Some(ext)
    } else {
        None
    }
}

/// 名字没带扩展名时，从 URL 路径里补一个
fn with_extension(name: String, url: &str) -> String {
    if extension_of(&name).is_some() {
        return name;
    }
    let path = url.split('?').next().unwrap_or("");
    match path.rsplit('/').next().and_then(extension_of) {
        Some(ext) => format!("{name}.{ext}"),
        None => name,
    }
}

fn unique_path(dir: &std::path::Path, name: &str) -> std::path::PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let (stem, ext) = match name.rsplit_once('.') {
        Some((stem, ext)) => (stem, format!(".{ext}")),
        None => (name, String::new()),
    };
    for index in 1..1000 {
        let next = dir.join(format!("{stem} ({index}){ext}"));
        if !next.exists() {
            return next;
        }
    }
    candidate
}

/// 取纯文本资源（弹幕 XML 等）。reqwest 开了 gzip/brotli/deflate，
/// 会自己发 Accept-Encoding 并按 Content-Encoding 解压，
/// 否则拿到的是压缩后的乱码。
#[tauri::command]
async fn fetch_text(url: String) -> Result<String, String> {
    if !url.starts_with("https://") || !host_allowed(&url) {
        return Err("不允许的地址".to_string());
    }

    let response = client()
        .get(&url)
        .header(header::REFERER, REFERER)
        .header(header::USER_AGENT, USER_AGENT)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status().as_u16()));
    }

    response.text().await.map_err(|error| error.to_string())
}

/// 流式写盘并回调进度；抽出来是为了能单独跑联网冒烟测试
async fn stream_to_file<F: FnMut(u64, u64)>(
    url: &str,
    path: &std::path::Path,
    mut on_progress: F,
) -> Result<u64, String> {
    let mut response = client()
        .get(url)
        .header(header::REFERER, REFERER)
        .header(header::ORIGIN, REFERER)
        .header(header::USER_AGENT, USER_AGENT)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("下载失败：HTTP {}", response.status().as_u16()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut file = tokio::fs::File::create(path)
        .await
        .map_err(|error| error.to_string())?;
    let mut received: u64 = 0;
    let mut reported: u64 = 0;

    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        file.write_all(&chunk)
            .await
            .map_err(|error| error.to_string())?;
        received += chunk.len() as u64;
        if received - reported >= PROGRESS_STEP {
            reported = received;
            on_progress(received, total);
        }
    }

    file.flush().await.map_err(|error| error.to_string())?;
    Ok(received)
}

/// 下载媒体到系统下载目录下的 bili-cat 文件夹。
/// 必须走 Rust：CDN 只认 `Referer: https://www.bilibili.com`，
/// WebView 里无论是 <a download> 还是 fetch 都改不了请求头。
#[tauri::command]
async fn download_media(
    app: tauri::AppHandle,
    id: String,
    url: String,
    file_name: String,
) -> Result<String, String> {
    if !url.starts_with("https://") || !host_allowed(&url) {
        return Err("不允许的下载地址".to_string());
    }

    let dir = app
        .path()
        .download_dir()
        .map_err(|error| error.to_string())?
        .join("bili-cat");
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|error| error.to_string())?;

    let file_name = with_extension(sanitize_file_name(&file_name), &url);
    let path = unique_path(&dir, &file_name);

    let emit_app = app.clone();
    let emit_id = id.clone();
    stream_to_file(&url, &path, move |received, total| {
        let _ = emit_app.emit(
            DOWNLOAD_EVENT,
            DownloadProgress {
                id: emit_id.clone(),
                received,
                total,
                done: false,
            },
        );
    })
    .await?;

    let _ = app.emit(
        DOWNLOAD_EVENT,
        DownloadProgress {
            id,
            received: std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
            total: 0,
            done: true,
        },
    );

    Ok(path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .register_asynchronous_uri_scheme_protocol("bilistream", |_ctx, request, responder| {
            tauri::async_runtime::spawn(async move {
                let response = match proxy(request).await {
                    Ok(response) => response,
                    Err(message) => {
                        eprintln!("[bilistream] 代理失败: {message}");
                        Response::builder()
                            .status(StatusCode::BAD_GATEWAY)
                            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                            .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
                            .body(message.into_bytes())
                            .unwrap_or_else(|_| Response::new(Vec::new()))
                    }
                };
                responder.respond(response);
            });
        })
        .invoke_handler(tauri::generate_handler![greet, download_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_public_cdn_hosts() {
        assert!(host_allowed(
            "https://upos-sz-mirrorbd.bilivideo.com/upgcxcode/x.mp4?e=abc"
        ));
        // 真实日志里的 PCDN 节点
        assert!(host_allowed(
            "https://b-baae99b805bolbv29i62qura9751e.edge.mountaintoys.cn:4483/upgcxcode/x.mp4"
        ));
        assert!(host_allowed("https://xy1.mcdn.bilivideo.cn/a"));
        assert!(host_allowed("https://1.2.3.4/a"));
        assert!(host_allowed("https://[2606:4700::1111]/a"));
    }

    #[test]
    fn rejects_private_and_non_https() {
        assert!(!host_allowed("http://upos-sz-mirrorbd.bilivideo.com/x"));
        assert!(!host_allowed("https://127.0.0.1/x"));
        assert!(!host_allowed("https://localhost/x"));
        assert!(!host_allowed("https://192.168.1.1/x"));
        assert!(!host_allowed("https://10.0.0.5/x"));
        assert!(!host_allowed("https://172.16.3.4/x"));
        assert!(!host_allowed("https://169.254.1.1/x"));
        assert!(!host_allowed("https://[::1]/x"));
        assert!(!host_allowed("https://[::ffff:127.0.0.1]/x"));
        assert!(!host_allowed("https://[fd00::1]/x"));
        assert!(!host_allowed("https://router.local/x"));
        assert!(!host_allowed("https://foo.internal/x"));
    }

    #[test]
    fn clamps_open_ended_ranges() {
        assert_eq!(clamp_range("bytes=0-").as_deref(), Some("bytes=0-4194303"));
        assert_eq!(clamp_range("bytes=100-199").as_deref(), Some("bytes=100-199"));
        assert_eq!(
            clamp_range("bytes=100000000-").as_deref(),
            Some("bytes=100000000-104194303")
        );
        assert_eq!(clamp_range("bytes=200-100"), None);
        assert_eq!(clamp_range("items=0-"), None);
    }

    #[test]
    fn sanitizes_file_names() {
        assert_eq!(sanitize_file_name("标题/带斜杠"), "标题_带斜杠");
        assert_eq!(sanitize_file_name("a:b*c?d"), "a_b_c_d");
        // 斜杠被替换 + 前导点被去掉，无法构成路径穿越
        assert_eq!(sanitize_file_name("../../etc/passwd"), "_.._etc_passwd");
        assert_eq!(sanitize_file_name("   "), "bili-cat-media");
        assert_eq!(sanitize_file_name(".."), "bili-cat-media");
    }

    #[test]
    fn completes_missing_extension() {
        assert_eq!(
            with_extension("视频标题".to_string(), "https://x.com/a/b.mp4?e=1"),
            "视频标题.mp4"
        );
        assert_eq!(
            with_extension("已带后缀.mp4".to_string(), "https://x.com/a/b.mp4"),
            "已带后缀.mp4"
        );
        assert_eq!(
            with_extension("无扩展".to_string(), "https://x.com/a/b"),
            "无扩展"
        );
        // 标题里的 "3.14" 不是扩展名，仍应补上
        assert_eq!(
            with_extension("3.14 圆周率".to_string(), "https://x.com/a/b.mp4"),
            "3.14 圆周率.mp4"
        );
    }

    fn temp_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join("bili-cat-test");
        std::fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn picks_non_conflicting_path() {
        let dir = temp_dir().join("unique");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create dir");

        let first = unique_path(&dir, "video.mp4");
        std::fs::write(&first, b"x").expect("write");
        let second = unique_path(&dir, "video.mp4");
        assert_eq!(second.file_name().unwrap(), "video (1).mp4");
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// 真实 CDN 的下载冒烟测试，需要网络：
    ///   BILI_TEST_MEDIA_URL=... cargo test --lib -- --ignored
    #[tokio::test]
    #[ignore = "需要网络与真实媒体地址"]
    async fn downloads_real_media() {
        let url = std::env::var("BILI_TEST_MEDIA_URL").expect("未设置 BILI_TEST_MEDIA_URL");
        let path = temp_dir().join("probe.mp4");
        let _ = std::fs::remove_file(&path);

        let mut events = 0u32;
        let received = stream_to_file(&url, &path, |_, _| events += 1)
            .await
            .expect("download failed");

        let written = std::fs::metadata(&path).expect("stat").len();
        assert!(received > 0, "没有收到任何字节");
        assert_eq!(received, written, "写入字节数与接收字节数不一致");
        println!("下载 {received} 字节，进度回调 {events} 次，文件 {}", path.display());
    }
}

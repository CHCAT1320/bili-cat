import { API, client } from "./index";

export interface VideoActionState {
  liked: boolean;
  /** 已投币数 0/1/2 */
  coined: number;
  favored: boolean;
  followed: boolean;
}

export interface FavoriteFolderOption {
  id: number;
  title: string;
  count: number;
  /** 1 表示该视频已在此收藏夹 */
  selected: boolean;
}

/** 视频收藏的 type 固定为 2 */
const FAV_TYPE_VIDEO = 2;

/** 未登录时全部按未操作处理，调用方只在登录后请求 */
export async function fetchVideoActions(
  aid: number,
  mid: number,
): Promise<VideoActionState> {
  const [like, coin, fav, relation] = await Promise.all([
    client
      .request<number>(API.video.info.has_liked, { params: { aid } })
      .catch(() => 0),
    client
      .request<{ multiply?: number }>(API.video.info.get_pay_coins, {
        params: { aid },
      })
      .catch(() => ({ multiply: 0 })),
    client
      .request<{ favoured?: boolean }>(API.video.info.has_favoured, {
        params: { aid },
      })
      .catch(() => ({ favoured: false })),
    mid > 0
      ? client
          .request<{ relation?: { attribute?: number } }>(
            API.user.info.relation,
            { params: { mid } },
          )
          .catch(() => ({ relation: undefined }))
      : Promise.resolve({ relation: undefined }),
  ]);

  const attribute = relation?.relation?.attribute ?? 0;
  return {
    liked: like === 1,
    coined: coin?.multiply ?? 0,
    favored: Boolean(fav?.favoured),
    // 2 已关注，6 互相关注
    followed: attribute === 2 || attribute === 6,
  };
}

/** like=true 点赞，false 取消 */
export async function setVideoLike(
  aid: number,
  bvid: string,
  like: boolean,
): Promise<void> {
  await client.request(API.video.operate.like, {
    data: { aid, bvid, like: like ? 1 : 2 },
  });
}

/**
 * 投币，count 为 1 或 2；select_like 为 1 时同时点赞。
 * 返回是否触发了点赞，交给调用方同步状态。
 */
export async function addVideoCoin(
  aid: number,
  bvid: string,
  count: 1 | 2,
  alsoLike: boolean,
): Promise<void> {
  await client.request(API.video.operate.coin, {
    data: { aid, bvid, multiply: count, select_like: alsoLike ? 1 : 0 },
  });
}

export async function fetchFavoriteFolders(
  aid: number,
  mid: number,
): Promise<FavoriteFolderOption[]> {
  const data = await client.request<{
    list?: Array<{
      id?: number;
      title?: string;
      media_count?: number;
      fav_state?: number;
    }>;
  }>(API.video.info.media_list, { params: { rid: aid, up_mid: mid } });

  return (data.list ?? [])
    .filter((folder) => (folder.id ?? 0) > 0)
    .map((folder) => ({
      id: folder.id as number,
      title: folder.title ?? "",
      count: folder.media_count ?? 0,
      selected: folder.fav_state === 1,
    }));
}

export async function setVideoFavorite(
  aid: number,
  addIds: number[],
  delIds: number[],
): Promise<void> {
  await client.request(API.video.operate.favorite, {
    data: {
      rid: aid,
      type: FAV_TYPE_VIDEO,
      add_media_ids: addIds,
      del_media_ids: delIds,
    },
  });
}

/** act: 1 关注，2 取关 */
export async function setUserFollow(
  mid: number,
  follow: boolean,
): Promise<void> {
  await client.request(API.user.operate.modify, {
    data: { fid: mid, act: follow ? 1 : 2, re_src: 11 },
  });
}

/** 一键三连（点赞+投币+收藏） */
export async function tripleVideo(aid: number, bvid: string): Promise<void> {
  await client.request(API.video.operate.yjsl, { params: { aid, bvid } });
}

export async function shareVideo(aid: number, bvid: string): Promise<void> {
  await client.request(API.video.operate.share, { data: { aid, bvid } });
}

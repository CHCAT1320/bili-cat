import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type {
  DynamicAdditional,
  DynamicCard as DynamicCardData,
  DynamicItem,
  RichText,
  RichTextNode,
} from "../bilibili/dynamic";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { IconComment, IconLike, IconRepost } from "../components/icons";
import { LoginDialog } from "../components/LoginDialog";
import { useAccount } from "../hooks/useAccount";
import { useDynamicFeed, type DynamicMode } from "../hooks/useDynamicFeed";
import { formatCount } from "../utils/format";
import "./Dynamic.css";

const TABS: DynamicMode[] = ["following", "hot"];

function bvidFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const match = /(BV[0-9A-Za-z]+)/.exec(url);
  return match?.[1];
}

function Dynamic() {
  const { t } = useTranslation();
  const account = useAccount();
  const loggedIn = Boolean(account.user?.isLogin);
  const [mode, setMode] = useState<DynamicMode>("following");
  const [loginOpen, setLoginOpen] = useState(false);
  const feed = useDynamicFeed(mode, mode === "hot" || loggedIn);

  return (
    <div className="dynamicPage">
      <AppHeader />
      <div className="dynamicBody">
        <div className="dynamicTabs">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === mode ? "dynamicTab dynamicTabActive" : "dynamicTab"}
              onClick={() => setMode(value)}
            >
              {t(`dynamic.tab.${value}`)}
            </button>
          ))}
        </div>

        {mode === "following" && !loggedIn ? (
          <div className="statePanel">
            <span>{t("dynamic.needLogin")}</span>
            <button
              type="button"
              className="appButton"
              onClick={() => setLoginOpen(true)}
            >
              {t("login.action")}
            </button>
          </div>
        ) : feed.status === "error" ? (
          <FeedError message={feed.error} onRetry={feed.retry} />
        ) : feed.status === "loading" && feed.items.length === 0 ? (
          <FeedSkeleton />
        ) : feed.items.length === 0 ? (
          <div className="statePanel">{t("dynamic.empty")}</div>
        ) : (
          <>
            <ul className="dynamicList">
              {feed.items.map((item) => (
                <DynamicCard key={item.id} item={item} />
              ))}
            </ul>
            <FeedFooter
              hasMore={feed.hasMore}
              loading={feed.loadingMore}
              error={feed.errorMore}
              onLoadMore={feed.loadMore}
            />
          </>
        )}
      </div>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

function RichTextView({ rich }: { rich: RichText }) {
  return (
    <p className="dynamicText">
      {rich.nodes.map((node, index) => (
        <RichNode key={index} node={node} />
      ))}
    </p>
  );
}

function RichNode({ node }: { node: RichTextNode }) {
  if (node.emojiUrl) {
    return (
      <img
        className={node.emojiSize === 2 ? "dynamicEmoji dynamicEmojiBig" : "dynamicEmoji"}
        src={node.emojiUrl}
        alt={node.text}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (node.type === "RICH_TEXT_NODE_TYPE_AT" && node.rid) {
    return (
      <Link className="dynamicLink" to={`/space/${node.rid}`}>
        {node.text}
      </Link>
    );
  }
  if (node.type === "RICH_TEXT_NODE_TYPE_BV") {
    const bvid = bvidFromUrl(node.jumpUrl);
    if (bvid) {
      return (
        <Link className="dynamicLink" to={`/video/${bvid}`}>
          {node.text}
        </Link>
      );
    }
  }
  if (node.type === "RICH_TEXT_NODE_TYPE_TOPIC" || node.type === "RICH_TEXT_NODE_TYPE_WEB") {
    return <span className="dynamicLink">{node.text}</span>;
  }
  return <>{node.text}</>;
}

function CardView({ card }: { card: DynamicCardData }) {
  const { t } = useTranslation();
  if (card.kind === "none") {
    return card.tips ? <p className="dynamicNone">{card.tips}</p> : null;
  }

  if (card.kind === "images") {
    const many = card.images.length;
    const shape = many === 1 ? "single" : many === 2 || many === 4 ? "two" : "three";
    return (
      <div className={`dynamicImages dynamicImages-${shape}`}>
        {card.images.slice(0, 9).map((image, index) => (
          <img
            key={index}
            className="dynamicImage"
            src={image.url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
    );
  }

  const cover =
    card.kind === "article" ? card.covers[0] : card.cover;

  const inner = (
    <>
      {cover ? (
        <span className="dynamicCardCoverBox">
          <img
            className="dynamicCardCover"
            src={cover}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {"duration" in card && card.duration ? (
            <span className="dynamicCardDuration">{card.duration}</span>
          ) : null}
          {"liveState" in card ? (
            <span
              className={
                card.liveState === 1
                  ? "dynamicCardLive dynamicCardLiveOn"
                  : "dynamicCardLive"
              }
            >
              {card.liveState === 1 ? t("dynamic.liveOn") : t("dynamic.liveOff")}
            </span>
          ) : null}
        </span>
      ) : null}
      <span className="dynamicCardInfo">
        <span className="dynamicCardTitle">{card.title}</span>
        {"desc" in card && card.desc ? (
          <span className="dynamicCardDesc">{card.desc}</span>
        ) : null}
        {card.kind === "video" && card.stat ? (
          <span className="dynamicCardStat">{card.stat}</span>
        ) : null}
        {card.kind === "live" && (card.desc1 || card.desc2) ? (
          <span className="dynamicCardStat">
            {[card.desc1, card.desc2].filter(Boolean).join(" · ")}
          </span>
        ) : null}
        {"label" in card && card.label ? (
          <span className="dynamicCardLabel">{card.label}</span>
        ) : null}
      </span>
      {card.kind === "video" && card.badge ? (
        <span className="dynamicCardBadge">{card.badge}</span>
      ) : null}
    </>
  );

  if (card.kind === "video" && card.bvid) {
    return (
      <Link className="dynamicCardBox" to={`/video/${card.bvid}`}>
        {inner}
      </Link>
    );
  }
  return <div className="dynamicCardBox">{inner}</div>;
}

function AdditionalView({ additional }: { additional: DynamicAdditional }) {
  if (additional.kind === "ugc") {
    return (
      <div className="dynamicCardBox dynamicCardBoxSmall">
        {additional.cover ? (
          <span className="dynamicCardCoverBox">
            <img
              className="dynamicCardCover"
              src={additional.cover}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {additional.duration ? (
              <span className="dynamicCardDuration">{additional.duration}</span>
            ) : null}
          </span>
        ) : null}
        <span className="dynamicCardInfo">
          <span className="dynamicCardTitle">{additional.title}</span>
          {additional.desc ? (
            <span className="dynamicCardStat">{additional.desc}</span>
          ) : null}
        </span>
      </div>
    );
  }
  if (additional.kind === "vote") {
    return (
      <div className="dynamicVote">
        <p className="dynamicVoteTitle">{additional.title}</p>
        {additional.desc ? (
          <p className="dynamicVoteDesc">{additional.desc}</p>
        ) : null}
        <ul className="dynamicVoteOptions">
          {additional.options.map((option, index) => (
            <li key={index} className="dynamicVoteOption">
              <span>{option.desc}</span>
              <span className="dynamicVoteCount">{option.cnt ?? 0}</span>
            </li>
          ))}
        </ul>
        {additional.joinNum !== undefined ? (
          <p className="dynamicVoteDesc">{additional.joinNum} 人参与</p>
        ) : null}
      </div>
    );
  }
  if (additional.kind === "reserve") {
    return (
      <div className="dynamicVote">
        <p className="dynamicVoteTitle">{additional.title}</p>
        <p className="dynamicVoteDesc">
          {[additional.desc1, additional.desc2, additional.desc3]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    );
  }
  if (additional.kind === "goods") {
    return (
      <div className="dynamicGoods">
        {additional.headText ? (
          <p className="dynamicVoteDesc">{additional.headText}</p>
        ) : null}
        <div className="dynamicGoodsItems">
          {additional.items.map((item, index) => (
            <div key={index} className="dynamicGoodsItem">
              {item.cover ? (
                <img
                  className="dynamicGoodsCover"
                  src={item.cover}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className="dynamicGoodsName">{item.name}</span>
              {item.price ? (
                <span className="dynamicGoodsPrice">{item.price}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="dynamicCardBox dynamicCardBoxSmall">
      {additional.cover ? (
        <span className="dynamicCardCoverBox">
          <img
            className="dynamicCardCover"
            src={additional.cover}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </span>
      ) : null}
      <span className="dynamicCardInfo">
        {additional.headText ? (
          <span className="dynamicCardDesc">{additional.headText}</span>
        ) : null}
        <span className="dynamicCardTitle">{additional.title}</span>
        {additional.desc1 || additional.desc2 ? (
          <span className="dynamicCardDesc">
            {[additional.desc1, additional.desc2].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function DynamicBody({ item }: { item: DynamicItem }) {
  return (
    <>
      {item.text ? <RichTextView rich={item.text} /> : null}
      {item.card ? <CardView card={item.card} /> : null}
      {item.additional ? <AdditionalView additional={item.additional} /> : null}
      {item.forward ? (
        <div className="dynamicForward">
          <p className="dynamicForwardName">@{item.forward.author.name}</p>
          <DynamicBody item={item.forward} />
        </div>
      ) : null}
    </>
  );
}

function DynamicCard({ item }: { item: DynamicItem }) {
  const { t } = useTranslation();
  const flags = [
    item.tag,
    item.aigc ? t("dynamic.flagAigc") : null,
    item.inAudit ? t("dynamic.flagAudit") : null,
    item.onlyFans ? t("dynamic.flagOnlyFans") : null,
    !item.visible ? t("dynamic.flagFolded") : null,
  ].filter(Boolean) as string[];

  return (
    <li className="dynamicCard">
      <div className="dynamicHead">
        {item.author.face ? (
          <img
            className="dynamicAvatar"
            src={item.author.face}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="dynamicAvatar" />
        )}
        <div className="dynamicHeadText">
          <span className="dynamicNameRow">
            <Link className="dynamicAuthor" to={`/space/${item.author.mid}`}>
              {item.author.name}
            </Link>
            {item.author.label ? (
              <span className="dynamicLabel">{item.author.label}</span>
            ) : null}
            {item.author.officialDesc ? (
              <span className="dynamicOfficial">{item.author.officialDesc}</span>
            ) : null}
          </span>
          <span className="dynamicTime">
            {item.pubTimeText ||
              (item.pubTime ? new Date(item.pubTime * 1000).toLocaleString() : "")}
            {item.author.location ? ` · ${item.author.location}` : ""}
          </span>
        </div>
      </div>

      {flags.length > 0 ? (
        <div className="dynamicFlags">
          {flags.map((flag) => (
            <span key={flag} className="dynamicFlag">
              {flag}
            </span>
          ))}
        </div>
      ) : null}

      {item.dispute ? (
        <div className="dynamicDispute">
          <strong>{item.dispute.title}</strong>
          {item.dispute.desc ? <span>{item.dispute.desc}</span> : null}
        </div>
      ) : null}

      <DynamicBody item={item} />

      {item.interaction.length > 0 ? (
        <ul className="dynamicInteraction">
          {item.interaction.slice(0, 3).map((text, index) => (
            <li key={index} className="dynamicInteractionItem">
              {text}
            </li>
          ))}
        </ul>
      ) : null}

      {item.foldStatement ? (
        <p className="dynamicFold">{item.foldStatement}</p>
      ) : null}

      <div className="dynamicFoot">
        <span className="dynamicStat">
          <IconRepost size={15} /> {formatCount(item.forwardCount)}
        </span>
        <span className="dynamicStat">
          <IconComment size={15} /> {formatCount(item.comment)}
        </span>
        <span className="dynamicStat">
          <IconLike size={15} /> {formatCount(item.like)}
        </span>
      </div>
    </li>
  );
}

export default Dynamic;

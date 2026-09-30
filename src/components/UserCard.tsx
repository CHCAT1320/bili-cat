import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { UserCardData } from "../bilibili/users";
import { formatCount } from "../utils/format";
import "./UserCard.css";

interface UserCardProps {
  user: UserCardData;
}

export function UserCard({ user }: UserCardProps) {
  const { t } = useTranslation();

  return (
    <Link className="userCard" to={`/space/${user.mid}`}>
      <div className="userCardHead">
        {user.face ? (
          <img
            className="userAvatar"
            src={user.face}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="userAvatar" />
        )}
        <div className="userCardTitle">
          <p className="userName">
            {user.name}
            {user.level ? <span className="userLevel">LV{user.level}</span> : null}
          </p>
          <p className="userStats">
            {formatCount(user.fans)} {t("space.fans")} ·{" "}
            {formatCount(user.videos)} {t("space.videos")}
          </p>
        </div>
      </div>

      {user.verify ? <p className="userVerify">{user.verify}</p> : null}
      {user.sign ? <p className="userSign">{user.sign}</p> : null}
    </Link>
  );
}

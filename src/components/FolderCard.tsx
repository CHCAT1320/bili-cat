import { Link } from "react-router";
import type { FavoriteFolder } from "../bilibili/userCenter";
import "./FolderCard.css";

interface FolderCardProps {
  folder: FavoriteFolder;
  onClick: (folder: FavoriteFolder) => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <Link
      className="folderCard"
      to="#"
      onClick={(event) => {
        event.preventDefault();
        onClick(folder);
      }}
    >
      <div className="folderCoverBox">
        {folder.cover ? (
          <img
            className="folderCover"
            src={folder.cover}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
      <p className="folderTitle">{folder.title}</p>
      <p className="folderCount">{folder.mediaCount}</p>
    </Link>
  );
}

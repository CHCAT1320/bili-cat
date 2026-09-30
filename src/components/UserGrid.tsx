import type { UserCardData } from "../bilibili/users";
import { UserCard } from "./UserCard";
import "./UserGrid.css";

interface UserGridProps {
  users: UserCardData[];
  ref?: React.Ref<HTMLDivElement>;
}

export function UserGrid({ users, ref }: UserGridProps) {
  return (
    <div ref={ref} className="userGrid">
      {users.map((user) => (
        <UserCard key={user.mid} user={user} />
      ))}
    </div>
  );
}

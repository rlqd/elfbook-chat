import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams, Outlet } from "react-router";
import SideMenu from "@/components/SideMenu";

export default function Space() {
  const { spaceId } = useParams();
  const space = useQuery(api.elf.getSpace, {spaceId: spaceId as Id<"spaces">});
  if (!space) {
    return (<></>);
  }

  return (
    <div className="flex h-screen w-screen">
      <SideMenu space={space} className="w-50 h-full shadow/30 z-100 p-2" />
      <div className="grow h-full flex flex-col w-full min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

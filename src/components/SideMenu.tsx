import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Link } from "react-router";
import { useState } from "react";

interface SideMenuProps {
  space: Doc<"spaces">,
  className: string,
};

export default function SideMenu({ space, className }: SideMenuProps) {
  const tags = useQuery(api.elf.listTags, {spaceId: space._id}) ?? [];
  const chats = useQuery(api.elf.listChats, {spaceId: space._id}) ?? [];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const visibleChats = chats.filter(c => {
    for (const tag of selectedTags) {
      if (!c.tags.includes(tag)) {
        return false;
      }
    }
    return true;
  });

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className={className} style={{ backgroundColor: `#${space.color ?? 'fff'}` }}>
      <div>
        <Link to="/">&lt;==</Link> {space.title}
      </div>
      {tags.length ? (
        <div className="mt-2 pt-2 border-t border-dotted">
          Tags: {tags.map((t, i) => (
            <>
              <span className={'cursor-pointer ' + (selectedTags.includes(t.title) ? 'underline' : '')} onClick={() => toggleTag(t.title)}>{t.title}</span>
              {i < tags.length - 1 ? ', ' : null}
            </>
          ))}
        </div>
      ) : null}
      <div className="mt-2 pt-2 border-t border-dotted">
        {visibleChats.length ? <><Link to={`/${space._id}/new`}>+ New Chat</Link><br/></> : null}
        {visibleChats.length ? visibleChats.map(c => (
          <><Link to={`/${space._id}/c/${c._id}`}>{c.title}</Link><br/></>
        )) : (selectedTags.length ? 'No matching chats' : 'No chats yet')}
      </div>
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Link, useParams } from "react-router";
import { useState, type ChangeEvent } from "react";

interface SideMenuProps {
  space: Doc<"spaces">,
  className: string,
};

export default function SideMenu({ space, className }: SideMenuProps) {
  const tags = useQuery(api.elf.listTags, {spaceId: space._id}) ?? [];
  const chats = useQuery(api.elf.listChats, {spaceId: space._id}) ?? [];
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { chatId } = useParams();

  const visibleChats = chats.filter(c => {
    for (const tag of selectedTags) {
      if (!c.tags.includes(tag)) {
        return false;
      }
    }
    return true;
  });

  const onTagsChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedTags(Array.from(event.target.selectedOptions).map(e => e.value));
  };

  return (
    <div className={className} style={{ backgroundColor: `#${space.color ?? 'fff'}` }}>
      <div className="flex flex-col h-full">
        <div>
          <Link to="/">&lt;==</Link> {space.title}
        </div>
        {tags.length ? (
          <div className="mt-2 pt-2 border-t border-dotted">
            <select name="tags" multiple size={Math.min(tags.length + 1, 5)} className="w-full" onChange={onTagsChange}>
              <optgroup label="Tags">
                { tags.map(t => <option value={t.title} selected={selectedTags.includes(t.title)}>{t.title}</option>) }
              </optgroup>
            </select>
          </div>
        ) : null}
        {visibleChats.length ? (
          <div className="mt-2 pt-2 border-t border-dotted">
            <Link to={`/${space._id}/new`} className="block italic">+ New Chat</Link>
          </div>
        ) : null}
        <div className="mt-1 min-h-0 overflow-y-auto">
          {visibleChats.length ? visibleChats.map(c => (
            <><Link to={`/${space._id}/c/${c._id}`} className="block whitespace-nowrap overflow-hidden text-ellipsis">{c._id == chatId ? '> ' : ''}{c.title}</Link></>
          )) : (selectedTags.length ? 'No matching chats' : 'No chats yet')}
        </div>
      </div>
    </div>
  );
}

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams } from "react-router";
import InputBar from "@/components/InputBar";
import Message from "@/components/Message";
import { useState } from "react";

export default function ExistingChat() {
  const { spaceId, chatId } = useParams();
  const sendMessage = useMutation(api.chat.sendMessage);
  const space = useQuery(api.elf.getSpace, {spaceId: spaceId as Id<"spaces">});
  const chat = useQuery(api.elf.getChat, {chatId: chatId as Id<"chats">});
  const messages = useQuery(api.chat.listMessages, {chatId: chatId as Id<"chats">}) ?? [];
  const editTitle = useMutation(api.elf.editChatTitle);
  const addTag = useMutation(api.elf.addChatTag);
  const delTag = useMutation(api.elf.delChatTag);

  const [ isEditingTitle, setEditingTitle ] = useState(false);
  const [ newTitle, setNewTitle ] = useState('');
  const [ isAddingTag, setAddingTag ] = useState(false);

  if (!space || !chat) {
    return (<></>);
  }

  const onSendMessage = async (model: string, keyId: Id<"keys">, text: string) => {
    await sendMessage({
      chatId: chat._id,
      model,
      keyId,
      text,
    });
  };

  const onEditTitle = async () => {
    if (newTitle.length) {
      await editTitle({chatId: chat._id, title: newTitle});
    }
    setEditingTitle(false);
  };

  const onAddTag = async (data: FormData) => {
    const tag = data.get("tag");
    if (tag && typeof tag === 'string') {
      await addTag({
        chatId: chat._id,
        tag,
      });
    }
    setAddingTag(false);
  };

  const onClickDelTag = async (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    if (!e.shiftKey) {
      alert("Shift+Click to confirm deleting the tag");
      return;
    }
    const tag = e.currentTarget.dataset.tag;
    if (tag) {
      await delTag({
        chatId: chat._id,
        tag,
      });
    }
  };

  return (
    <>
      <div className="p-2">
        <div>
          {isEditingTitle ? (
            <form action={onEditTitle}>
              <input type="text" name="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
            </form>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); setNewTitle(chat.title); setEditingTitle(true); }}>{chat.title}</a>
          )}
        </div>
        <div>
          { chat.tags.map(tag => (<><a href="#" data-tag={tag} onClick={onClickDelTag}>#{tag}</a>, </>)) }
          +{ isAddingTag ? (
            <form action={onAddTag} className="inline-block">
              <input type="text" name="tag" placeholder="new tag" className="w-25" autoFocus />
            </form>
          ) : (<a href="#" onClick={(e) => { e.preventDefault(); setAddingTag(true); }}>new tag</a>) }
        </div>
      </div>
      <div className="grow overflow-y-auto p-2 flex flex-col gap-2">
        {messages.map(m => <Message msg={m} />)}
      </div>
      <div className="bg-white shadow/30 z-90">
        <InputBar spaceId={space._id} sendMessage={onSendMessage} />
      </div>
    </>
  );
}

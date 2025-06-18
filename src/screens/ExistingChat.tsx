import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams } from "react-router";
import SideMenu from "@/components/SideMenu";
import InputBar from "@/components/InputBar";
import Message from "@/components/Message";

export default function ExistingChat() {
  const { spaceId, chatId } = useParams();
  const sendMessage = useMutation(api.chat.sendMessage);
  const space = useQuery(api.elf.getSpace, {spaceId: spaceId as Id<"spaces">});
  const chat = useQuery(api.chat.getChat, {chatId: chatId as Id<"chats">});
  const messages = useQuery(api.chat.listMessages, {chatId: chatId as Id<"chats">}) ?? [];
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

  return (
    <div className="flex h-screen w-screen">
      <SideMenu space={space} className="w-50 h-full shadow/30 z-100 p-2" />
      <div className="grow h-full flex flex-col w-full min-w-0">
        <div className="grow overflow-y-auto p-2 flex flex-col gap-2">
          {messages.map(m => <Message msg={m} />)}
        </div>
        <div className="bg-white shadow/30 z-90">
          <InputBar spaceId={space._id} sendMessage={onSendMessage} />
        </div>
      </div>
    </div>
  );
}

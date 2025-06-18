import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams, useNavigate } from "react-router";
import SideMenu from "@/components/SideMenu";
import InputBar from "@/components/InputBar";

export default function NewChat() {
  const navigate = useNavigate();
  const { spaceId } = useParams();
  const startChat = useMutation(api.chat.startChat);
  const space = useQuery(api.elf.getSpace, {spaceId: spaceId as Id<"spaces">});
  if (!space) {
    return (<></>);
  }

  const sendMessage = async (model: string, keyId: Id<"keys">, messageText: string) => {
    const chatId = await startChat({
      spaceId: space._id,
      model,
      keyId,
      messageText,
    });
    navigate(`/${space._id}/c/${chatId}`);
  };

  return (
    <div className="flex h-screen">
      <SideMenu space={space} className="w-50 h-full shadow/30 z-100 p-2" />
      <div className="grow h-full flex flex-col">
        <div className="grow overflow-y-auto text-center p-25">
          Waiting for you to start the chat 😉
        </div>
        <div className="bg-white shadow/30 z-90">
          <InputBar spaceId={space._id} sendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
}

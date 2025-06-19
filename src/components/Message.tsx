import { Doc } from "../../convex/_generated/dataModel";
import type { MessageType } from "../../convex/schema";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

const statusMessages: Partial<Record<MessageType,string>> = {
  "loading": "Loading...",
  "reasoning": "Reasoning...",
};

const loader = (
  <span className="inline-flex items-center ml-1 gap-[1px]">
    <span className="w-1 h-1 bg-dark rounded-full animate-blink-1" />
    <span className="w-1 h-1 bg-dark rounded-full animate-blink-2" />
    <span className="w-1 h-1 bg-dark rounded-full animate-blink-3" />
  </span>
);

export default function Message({ msg }: { msg: Doc<"messages"> }) {
  const isMine = msg.type === 'outgoing';

  return (
    <div className={"elf-message flex gap-2 " + (isMine ? 'text-blue-900' : '')}>
      <div className="pr-2 w-20 border-r border-dotted text-right">
        { isMine ? 'me:' : 'model:' }
      </div>
      <div className="block grow w-full min-w-0 text-wrap">
        { statusMessages[msg.type] ?? (
          isMine ? <pre>{msg.body}</pre>
          : <><Markdown rehypePlugins={[rehypeHighlight]}>{msg.body}</Markdown>{msg.type === 'streaming' ? loader : null}</>
        ) }
      </div>
    </div>
  );
}

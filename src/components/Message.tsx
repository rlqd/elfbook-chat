import { Doc } from "../../convex/_generated/dataModel";
import type { MessageType } from "../../convex/schema";

const statusMessages: Partial<Record<MessageType,string>> = {
  "loading": "Loading...",
  "reasoning": "Reasoning...",
};

export default function Message({ msg }: { msg: Doc<"messages"> }) {
  return (
    <div className={"flex gap-2 " + (msg.type === 'outgoing' ? 'text-blue-900' : '')}>
      <div className="pr-2 w-20 border-r border-dotted text-right">
        { msg.type === 'outgoing' ? 'me:' : 'model:' }
      </div>
      <pre className="block grow">
        { statusMessages[msg.type] ?? msg.body }
      </pre>
    </div>
  );
}

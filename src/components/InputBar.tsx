import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FormEvent, ChangeEvent } from "react";
import { useState } from "react";
import ReactModal from "react-modal";

function AddKeyForm({close}: {close: () => void}) {
  const addKey = useMutation(api.elf.addKey);

  const submitAddKey = async (data: FormData) => {
    const title = data.get("title");
    const value = data.get("value");
    if (!title || !value || typeof title !== 'string' || typeof value !== 'string') {
      alert("Please set both display name and secret");
      return;
    }
    await addKey({title, value});
    close();
  };

  return (
    <>
      <h1>Add your OpenRouter key</h1>
      <form className="flex gap-2 mt-2" action={submitAddKey}>
        <input type="text" name="title" className="px-2" placeholder="Key display name..."></input>
        <input type="password" name="value" className="px-2" placeholder="Key secret..."></input>
        <button type="submit" className="px-2">Save</button>
        <button type="button" className="px-2" onClick={close}>Close</button>
      </form>
    </>
  );
}

interface InputBarProps {
  spaceId: Id<"spaces">,
  sendMessage: (model: string, key: Id<"keys">, text: string) => Promise<void>,
}

export default function InputBar({spaceId, sendMessage}: InputBarProps) {
  const [addKeyModalOpen, setAddKeyModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  const models = useQuery(api.models.listModels) ?? [];
  const keys = useQuery(api.elf.listKeys) ?? [];
  const settings = useQuery(api.elf.getSettings, {spaceId});
  const editSettings = useMutation(api.elf.editSettings);

  const selectedModel = settings?.selectedModel ?? 'openai/gpt-4o';
  const selectedKeyId = settings?.selectedKey;

  const onSettingsChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    if (event.target.name === 'model') {
      await editSettings({spaceId, selectedModel: event.target.value});
    } else if (event.target.name === 'key') {
      await editSettings({spaceId, selectedKey: (event.target.value || null) as Id<"keys">|null});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit message using Ctrl + Enter (or Cmd + Enter on Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.currentTarget.closest('form')?.requestSubmit();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const model = data.get("model");
    const key = data.get("key");
    const text = data.get("text");
    if (!key) {
      alert('Please add or select a key first');
      return;
    }
    if (!model || !text || typeof model !== 'string' || typeof key !== 'string' || typeof text !== 'string') {
      return;
    }
    setInputText("");
    await sendMessage(model, key as Id<"keys">, text);
  };

  return (
    <>
    <ReactModal isOpen={addKeyModalOpen}><AddKeyForm close={() => setAddKeyModalOpen(false)} /></ReactModal>
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col w-full">
        <div className="flex border-b border-dotted gap-2 items-center">
          <select name="model" className="h-8" onChange={onSettingsChange}>
            {models.map(m => (
              <option value={m.id} selected={m.id == selectedModel}>{m.title}</option>
            ))}
          </select>
          {keys.length ? (
            <select name="key" className="h-8" onChange={onSettingsChange}>
              <option value="">&lt;select key&gt;</option>
              {keys.map(k => (
                <option value={k._id} selected={k._id == selectedKeyId}>{k.title}</option>
              ))}
            </select>
          ) : null}
          <button type="button" className="flex-none px-2 cursor-pointer shadow/30" onClick={() => setAddKeyModalOpen(true)}>Add key</button>
        </div>
        <div className="flex grow">
          <textarea
            name="text"
            className="block resize-none grow m-0 p-2 h-30"
            onKeyDown={handleKeyDown}
            autoFocus
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button type="submit" className="p-2 cursor-pointer">Send</button>
        </div>
      </div>
    </form>
    </>
  );
}

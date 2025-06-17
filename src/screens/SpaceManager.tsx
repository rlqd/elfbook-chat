import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router";
import SignOutButton from "@/components/SignOutButton";

export default function SpaceManager() {
  const spaces = useQuery(api.elf.listSpaces) ?? [];
  const addSpace = useMutation(api.elf.addSpace);

  const submitAddSpace = (data: FormData) => {
    const title = data.get("title");
    if (!title || !title.valueOf()) {
      alert('Please enter the title of your new space and press Enter');
      return;
    }
    addSpace({
      title: title.valueOf() as string,
      order: spaces.length,
    });
  };

  return (
    <>
      <h1 className="text-center text-3xl mt-10">Your Spaces</h1>
      <div className="flex justify-center gap-5 w-full md:w-1/2 mx-auto mt-10">
        { spaces.map(space => (
          <Link
            to={`/${space._id}`}
            className="block bg-white text-center align-middle leading-27 w-32 h-32 p-2 shadow/30"
          >
            {space.title}
          </Link>
        )) }
        <label htmlFor="new-space" className="block bg-white w-32 h-32 p-2 shadow/30 cursor-pointer">
          <form action={submitAddSpace}>
            <input id="new-space" name="title" className="w-full text-center my-10" type="text" placeholder="New Space..." />
          </form>
        </label>
      </div>
      <div className="flex mt-10 justify-center">
        <SignOutButton />
      </div>
    </>
  );
}

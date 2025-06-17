import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
    "openrouter models list sync",
    { hourUTC: 5, minuteUTC: 0 },
    internal.models.syncOpenRouterModels,
);

export default crons;

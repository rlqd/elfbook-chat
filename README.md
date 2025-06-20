# ElfBook Chat

## Get started

Clone this codebase and run:

```
npm install
npm run dev
```

## Preparing for first use

When you host your own ElfBook Chat or run it locally for development,
please follow these steps before trying to sign up.

### 1. Configure auth

```
node generateKeys.mjs
```

Copy full output of the command and paste it in Settings > Environmental Variables in your Covex dashboard.

For more information on how to configure Convex Auth, check out the [Convex Auth docs](https://labs.convex.dev/auth/).

### 2. Getting available models

Models are synced once per day using cron job. However, after first setup, please sync them manually once to prefill the list.

To do this, run [models.syncOpenRouterModels](http://127.0.0.1:6790/functions?function=models%3AsyncOpenRouterModels) function in your Convex dashboard.

## Contributing

To learn more about developing projects with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Screenshots

![Spaces](/screenshots/spaces.png)

![Chat](/screenshots/chat.png)

# Security policy

This repo has an install script, Claude Code plugin manifests and docs for a set of Model Context Protocol (MCP) servers. The servers have their own repos, so report a problem with a server in that server's repo. I maintain this repo on my own. If something here weakens a server's safeguards or leaks a credential, please tell me privately.

## Reporting a problem

Please keep the details out of public issues, pull requests and discussions.

- If this repo's **Security** tab shows a **Report a vulnerability** button, use it. That report is private.
- If there's no button, open an issue that asks for a private contact and says nothing else about the problem.

In the private report, the useful details are the file or command, the smallest steps that show the problem and what someone could do with it. Please use made-up account ids, and leave out real tokens and account data.

## In scope

- **Write-gate bypass.** The manifests and the install script don't turn on any server's write switch. Anything here that turns one on for the user, or that installs or starts a package other than the one it names, is in scope.
- **Credential leakage.** The manifests read credentials from your environment, and the install script prints placeholders. Anything here that stores, prints or sends a real token, secret or key is in scope.

PAUSED staging is out of scope here: nothing in this repo writes to an ad account, and each server decides what it stages.

## What I assume

- **A single-user Mac.** I build this for one person running it on their own Mac, or on another computer only they use. Anyone able to run programs under your account can use your credentials.
- **Your own platform credentials.** You connect each server to accounts you control, and each platform decides what that login can do.
- **A third-party server.** The meta-ads-mcp package isn't mine. It's by Pipeboard, so report a problem with it there.

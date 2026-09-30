<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Fiscal issuance uses protected server functions with Focus NFe per-organization credentials stored in RLS-locked fiscal_configs; only owners configure and production requires accountant approval, to prevent credential exposure and accidental live issuance.
- Fiscal documents retain one stable reference per sale/OS and query the provider before retrying, to avoid duplicate tax invoices on uncertain responses.

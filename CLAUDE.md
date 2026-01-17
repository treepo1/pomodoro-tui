# Project Guidelines

## Conventional Commits

The Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of. This convention dovetails with SemVer, by describing the features, fixes, and breaking changes made in commit messages.

The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `fix:` patches a bug in your codebase (correlates with PATCH in SemVer)
- `feat:` introduces a new feature to the codebase (correlates with MINOR in SemVer)
- `BREAKING CHANGE:` introduces a breaking API change (correlates with MAJOR in SemVer)
- Other allowed types: `build:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`

### Examples

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

```
feat!: send an email to the customer when a product is shipped
```

```
feat(api)!: send an email to the customer when a product is shipped
```

```
docs: correct spelling of CHANGELOG
```

```
feat(lang): add Polish language
```

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

### Rules

- Commits MUST be prefixed with a type (feat, fix, etc.), followed by optional scope, optional !, and REQUIRED terminal colon and space
- A scope MAY be provided after a type, consisting of a noun describing a section of the codebase surrounded by parenthesis, e.g., `fix(parser):`
- A description MUST immediately follow the colon and space after the type/scope prefix
- A longer commit body MAY be provided after the short description (one blank line after)
- Breaking changes MUST be indicated in the type/scope prefix (with !) or as a footer entry

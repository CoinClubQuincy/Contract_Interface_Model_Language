# Contributing

Thanks for helping. Please open an issue before starting anything large.

## Set up

You need Node 20 or later, pnpm 9, and [Foundry](https://getfoundry.sh) for the local-chain tests. Without Foundry those tests are skipped.

```bash
pnpm install
pnpm build
pnpm test
```

## Rules

- **Change the format deliberately.** Anything that changes what a document means needs a spec change, conformance vectors and a changelog entry in the same pull request.
- **Generated files stay in step.** Run `pnpm generate` after changing the schema, the generators or the vectors. CI checks this.
- **Every new check gets a vector.** Add it to `scripts/generate-vectors.ts`. A test fails if a validation code has no vector, and another if a code is missing from the spec.
- **Security behaviour needs a test that fails without it.** Break the behaviour and confirm the test notices.
- **Keep error codes stable.** Add new ones, and do not reuse old ones.
- **No execution in documents.** Proposals that would let a document run code or carry raw markup will be declined.

## Other implementations

An implementation in another language is welcome. `conformance/` is plain JSON, and passing it is the definition of conforming.

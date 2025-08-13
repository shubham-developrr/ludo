# Contributing to Ludo Multiplayer

We're excited that you're interested in contributing to this project! To ensure a smooth and collaborative development process, please follow the guidelines below.

## Development Workflow

All development, whether it's for a new feature, a bug fix, or a simple cleanup, should happen on a separate branch. This keeps the `main` branch clean and stable.

### Branching Strategy

We use a simple branching model based on the purpose of the change. Please name your branches using the following convention:

- **feature/**: For new features (e.g., `feature/spectator-mode`).
- **bugfix/**: For fixing bugs (e.g., `bugfix/fix-token-capture-issue`).
- **chore/**: For maintenance tasks that don't add features or fix bugs (e.g., `chore/update-dependencies`, `chore/refactor-game-logic`).
- **docs/**: For changes to documentation (e.g., `docs/update-readme`).

To create a new branch, use the following command:
```bash
git checkout -b <branch-type>/<short-description>
```
For example:
```bash
git checkout -b feature/animated-dice-roll
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This makes the commit history readable and helps with automated tooling in the future.

Each commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Common types:**
- `feat`: A new feature.
- `fix`: A bug fix.
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation.
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.

**Example commit message:**
```
feat: Add animated dice roll

This commit introduces a new dice roll animation using GSAP.
The animation provides visual feedback to the player and improves
the overall user experience.
```

### Code Review and Merging

Once your changes are complete and tested, please follow these steps:

1.  **Push your branch** to the remote repository:
    ```bash
    git push origin <branch-name>
    ```
2.  **Create a Pull Request (PR)** on GitHub, targeting the `main` branch.
3.  **Fill out the PR template**, providing a clear description of your changes, why they are needed, and how you have tested them.
4.  **Request a review** from one of the project maintainers.
5.  **Address any feedback** you receive. Once your PR is approved, it will be merged into the `main` branch.

Thank you for your contributions!

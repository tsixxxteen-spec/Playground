import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import "./InviteDialog.css";

type InviteDialogProps = {
  onClose: () => void;
  onInvite: (
    username: string,
  ) => void;
};

export default function InviteDialog({
  onClose,
  onInvite,
}: InviteDialogProps) {
  const [username, setUsername] =
    useState("");

  const inputRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const value = username.trim();

    if (!value) {
      return;
    }

    onInvite(value);
  };

  return (
    <div
      className="invite-dialog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="invite-dialog__header">
          <div>
            <p>Shared Playground</p>

            <h2 id="invite-dialog-title">
              Invite People
            </h2>
          </div>

          <button
            className="invite-dialog__close"
            type="button"
            aria-label="Close invite dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          className="invite-dialog__form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="collaborator-username">
            Username
          </label>

          <input
            ref={inputRef}
            id="collaborator-username"
            value={username}
            placeholder="Search by username..."
            autoComplete="off"
            onChange={(event) =>
              setUsername(
                event.target.value,
              )
            }
          />

          <p className="invite-dialog__hint">
            The invitation stays pending until
            the person accepts it.
          </p>

          <div className="invite-dialog__actions">
            <button
              className="invite-dialog__cancel"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="invite-dialog__submit"
              type="submit"
              disabled={!username.trim()}
            >
              Send Invite
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

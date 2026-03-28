import { useEffect, useMemo, useReducer, useRef } from "react";

import {
  closePreviewSession,
  openPreviewSession,
  readArchivePage,
  readPreviewChunk,
} from "@/shared/lib/tauri";
import type {
  ArchivePreviewPage,
  PreviewChunkResponse,
  PreviewSessionInfo,
  PreviewSessionOpenRequest,
} from "@/shared/types/api";

type UsePreviewSessionOptions = {
  active: boolean;
  request: PreviewSessionOpenRequest | null;
  chunkOffset: number;
  chunkLength: number;
  archiveOffset: number;
  archivePageSize: number;
};

type PreviewSessionState = {
  session: PreviewSessionInfo | null;
  chunk: PreviewChunkResponse | null;
  archivePage: ArchivePreviewPage | null;
  loading: boolean;
  error: string | null;
};

type PreviewSessionAction =
  | { type: "reset" }
  | { type: "loading" }
  | { type: "opened"; session: PreviewSessionInfo }
  | { type: "chunk"; chunk: PreviewChunkResponse }
  | { type: "archive"; archivePage: ArchivePreviewPage }
  | { type: "error"; error: string };

function previewSessionReducer(state: PreviewSessionState, action: PreviewSessionAction): PreviewSessionState {
  switch (action.type) {
    case "reset":
      return {
        session: null,
        chunk: null,
        archivePage: null,
        loading: false,
        error: null,
      };
    case "loading":
      return {
        ...state,
        loading: true,
        error: null,
      };
    case "opened":
      return {
        session: action.session,
        chunk: null,
        archivePage: null,
        loading: true,
        error: null,
      };
    case "chunk":
      return {
        ...state,
        chunk: action.chunk,
        archivePage: null,
        loading: false,
        error: null,
      };
    case "archive":
      return {
        ...state,
        chunk: null,
        archivePage: action.archivePage,
        loading: false,
        error: null,
      };
    case "error":
      return {
        ...state,
        loading: false,
        error: action.error,
      };
    default:
      return state;
  }
}

function previewErrorMessage(caughtError: unknown, fallback: string) {
  if (caughtError instanceof Error && caughtError.message.trim()) {
    return caughtError.message;
  }
  if (typeof caughtError === "string" && caughtError.trim()) {
    return caughtError;
  }
  return fallback;
}

export function usePreviewSession({
  active,
  request,
  chunkOffset,
  chunkLength,
  archiveOffset,
  archivePageSize,
}: UsePreviewSessionOptions) {
  const sessionIdRef = useRef<string | null>(null);
  const [state, dispatch] = useReducer(previewSessionReducer, {
    session: null,
    chunk: null,
    archivePage: null,
    loading: false,
    error: null,
  });

  const requestKey = useMemo(() => {
    if (!request) {
      return null;
    }
    const targetKey =
      request.target.kind === "artifact"
        ? `artifact:${request.target.scan_id}:${request.target.artifact_id}`
        : `entry:${request.target.source_id}:${request.target.path}`;
    return `${targetKey}:${request.mode}`;
  }, [request]);

  useEffect(() => {
    let disposed = false;
    const previousSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (previousSessionId) {
      void closePreviewSession(previousSessionId).catch(() => undefined);
    }

    dispatch({ type: "reset" });

    if (!active || !request) {
      return;
    }

    dispatch({ type: "loading" });
    void openPreviewSession(request)
      .then((info) => {
        if (disposed) {
          void closePreviewSession(info.session_id).catch(() => undefined);
          return;
        }
        sessionIdRef.current = info.session_id;
        dispatch({ type: "opened", session: info });
      })
      .catch((caughtError) => {
        if (!disposed) {
          dispatch({
            type: "error",
            error: previewErrorMessage(caughtError, "Unable to open preview session"),
          });
        }
      });

    return () => {
      disposed = true;
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) {
        void closePreviewSession(sessionId).catch(() => undefined);
      }
    };
  }, [active, request, requestKey]);

  useEffect(() => {
    if (!active || !state.session) {
      return;
    }

    let disposed = false;
    dispatch({ type: "loading" });

    if (state.session.resolved_mode === "archive") {
      void readArchivePage(state.session.session_id, archiveOffset, archivePageSize)
        .then((page) => {
          if (!disposed) {
            dispatch({ type: "archive", archivePage: page });
          }
        })
        .catch((caughtError) => {
          if (!disposed) {
            dispatch({
              type: "error",
              error: previewErrorMessage(caughtError, "Unable to load archive page"),
            });
          }
        });
      return () => {
        disposed = true;
      };
    }

    void readPreviewChunk(state.session.session_id, chunkOffset, chunkLength)
      .then((result) => {
        if (!disposed) {
          dispatch({ type: "chunk", chunk: result });
        }
      })
      .catch((caughtError) => {
        if (!disposed) {
          dispatch({
            type: "error",
            error: previewErrorMessage(caughtError, "Unable to load preview chunk"),
          });
        }
      });

    return () => {
      disposed = true;
    };
  }, [active, archiveOffset, archivePageSize, chunkLength, chunkOffset, state.session]);

  return {
    session: state.session,
    chunk: state.chunk,
    archivePage: state.archivePage,
    loading: state.loading,
    error: state.error,
  };
}

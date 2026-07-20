// src/hooks/useSocket.js — Socket.io connection hook
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

/**
 * useSocket
 * @param {string} namespace  '/tracking' | '/driver'
 * @param {object} authToken  { token } for /driver namespace
 * @param {object} handlers   { eventName: handlerFn }
 */
export function useSocket(namespace = '/tracking', authToken = null, handlers = {}) {
  const socketRef   = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep the ref pointing at the latest handlers on every render, so the
  // stable listeners attached below always call current code — not a
  // closure frozen at whatever state existed when the socket first connected.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const opts = {
      transports:       ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    };
    if (authToken) opts.auth = authToken;

    const socket = io(`${SOCKET_URL}${namespace}`, opts);
    socketRef.current = socket;

    // Attach one stable wrapper per event that always delegates to whatever
    // handler is current at the moment the event actually fires.
    const stableHandlers = {};
    Object.keys(handlersRef.current).forEach((event) => {
      stableHandlers[event] = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, stableHandlers[event]);
    });

    socket.on('connect',       () => console.log(`[Socket] Connected to ${namespace}`));
    socket.on('connect_error', (e) => console.warn(`[Socket] Error on ${namespace}:`, e.message));
    socket.on('disconnect',    () => console.log(`[Socket] Disconnected from ${namespace}`));

    return () => {
      Object.entries(stableHandlers).forEach(([event, fn]) => socket.off(event, fn));
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socket: socketRef };
}

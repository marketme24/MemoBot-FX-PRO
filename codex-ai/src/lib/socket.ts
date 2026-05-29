import { io } from "socket.io-client";

const socket = io(window.location.origin);

export const joinProject = (projectId: string) => {
  socket.emit("join-project", projectId);
};

export const emitFileChange = (projectId: string, fileId: string, content: string) => {
  socket.emit("file-change", { projectId, fileId, content });
};

export const onFileUpdate = (callback: (data: { fileId: string, content: string }) => void) => {
  socket.on("file-updated", callback);
};

export default socket;

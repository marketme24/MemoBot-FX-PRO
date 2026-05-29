import { useState, useEffect, useCallback } from "react";

export interface Project {
  id: string;
  name: string;
}

export interface FileNode {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  type: "file" | "folder";
}

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects);
    if (data.projects.length > 0 && !project) {
      setProject(data.projects[0]);
    }
    setLoading(false);
  }, [project]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!project) {
      setFiles([]);
      return;
    }
    setLoading(true);
    fetch(`/api/projects/${project.id}/files`)
      .then(res => res.json())
      .then(data => {
        setFiles(data.files || []);
        setLoading(false);
      });
  }, [project]);

  const createProject = async (name: string) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setProjects(prev => [...prev, data.project]);
    setProject(data.project);
    return data.project.id;
  };

  const switchProject = (projectId: string) => {
    const selected = projects.find(p => p.id === projectId);
    if (selected) setProject(selected);
  };

  const updateFileContent = async (fileId: string, content: string) => {
    if (!project) return;
    await fetch(`/api/projects/${project.id}/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, content } : f)));
  };

  const createFile = async (filePath: string, type: "file" | "folder" = "file", language: string = "plaintext") => {
    if (!project) return;
    const res = await fetch(`/api/projects/${project.id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content: "", language, type }),
    });
    const data = await res.json();
    setFiles(prev => [...prev, data.file]);
  };

  const deleteFile = async (fileId: string) => {
    if (!project) return;
    await fetch(`/api/projects/${project.id}/files/${fileId}`, { method: "DELETE" });
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const renameFile = async (fileId: string, newPath: string) => {
    if (!project) return;
    await fetch(`/api/projects/${project.id}/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: newPath }),
    });
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, path: newPath } : f)));
  };

  return { project, projects, files, loading, updateFileContent, createFile, deleteFile, renameFile, createProject, switchProject };
}

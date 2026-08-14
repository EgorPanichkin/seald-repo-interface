export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  namespace: { name: string; path: string };
  http_url_to_repo: string;
  ssh_url_to_repo: string;
  description: string | null;
  last_activity_at: string;
  default_branch: string;
}

export async function listDeployRepos(gitlabUrl: string, token: string): Promise<GitLabProject[]> {
  const url = `${gitlabUrl}/api/v4/projects?search=gs-deploy&membership=true&per_page=100&order_by=last_activity_at&sort=desc`;
  const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`GitLab API ${res.status}: ${body}`);
  }
  const projects: GitLabProject[] = await res.json();
  return projects.filter(p => p.name.includes('gs-deploy') || p.path.includes('gs-deploy'));
}

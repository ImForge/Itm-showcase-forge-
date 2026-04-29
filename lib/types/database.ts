export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  roll_number: string | null
  graduation_year: number | null
  created_at: string
}

export type Project = {
  id: string
  title: string
  description: string
  long_description: string | null
  thumbnail_url: string | null
  repo_url: string | null
  live_url: string | null
  demo_url: string | null
  submitted_by: string | null
  academic_year: string | null
  semester: string | null
  status: 'pending' | 'approved' | 'rejected'
  views: number
  created_at: string
  updated_at: string
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type ProjectWithDetails = Project & {
  profiles: Profile | null
  project_tags: { tags: Tag }[]
  project_members: { profiles: Profile; role: string }[]
  build_ons_child: { parent_project_id: string; projects: Project }[]
}
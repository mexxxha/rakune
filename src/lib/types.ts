export type Work = {
  id: string;
  title: string;
  image: string;
  thumb: string;
  caption?: string;
  year?: number;
};

export type ProfileLink = {
  label: string;
  url: string;
};

export type Profile = {
  name: string;
  photo: string;
  bio: string;
  links: ProfileLink[];
};

export type Portfolio = {
  works: Work[];
  profile: Profile;
};

# LearnToEarn Hub

LEADERBOARD — Learn to Earn Community Showcase

Build a modern web application called Leaderboard, the official project showcase platform for the LearnToEarn community.

Core Vision

Leaderboard is where LearnToEarn members showcase what they're building, receive meaningful feedback, discover incredible community projects, and compete in a fun weekly challenge to climb the leaderboard.

The platform should inspire people to keep building, shipping, learning, and supporting one another.

Think of it as Product Hunt × GitHub × Formula 1 × Indie Hackers, designed specifically for the LearnToEarn Fellowship.

Design Style

The UI should closely match the provided inspiration.

Maintain the same visual identity:

 Clean minimalist layout

 Retro hacker aesthetic

 Monospaced typography

 Bright neon green accent

 White background

 Dark project cards

 Brutalist design principles

 Large bold headlines

 Lots of whitespace

 Sharp rectangular buttons

 Pixel-inspired details

Use:

 IBM Plex Mono

 Space Mono

 JetBrains Mono

Primary colors:

Background: #F7F7F5

Black: #111111

Neon Green: #7CFC00

Dark Card: #171717

Gray: #A5A5A5

Hero Section

Large headline:

BUILD.
SHARE.
CLIMB.

Small subtitle:

A place where tp showcase what you're building, receive feedback, discover amazing projects, and climb the community leaderboard.

Buttons:

 Explore Projects

 Submit Project

Below the hero, display live community stats:

 Builders

 Projects Submitted

 Weekly Votes

 Projects Launched

 Active This Week

Animate the numbers when the page loads.

Live Race Track

The hero feature of the website.

Replace a traditional leaderboard with an animated race track.

Each builder is represented by a colorful race car.

Every upvote moves their car forward in real time.

Features:

 Smooth car movement

 Overtaking animations

 Finish line

 Tire smoke on acceleration

 Speed effects

 Position updates without refreshing

 Live rankings

Display:

Rank

Avatar

Username

Project Name

Votes

Distance to Finish

When someone reaches first place:

 confetti animation

 podium glow

 celebration effect

The race should feel alive throughout the week.

Discover Projects

Beautiful project cards showing:

Project image

Project name

Builder

Short description

Tech stack

Category

Live Demo

GitHub

Comments

Vote count

Current Rank

Hover animation:

 card lifts

 neon border

 subtle shadow

 smooth transitions

Allow sorting by:

 Trending

 Newest

 Most Voted

 Most Commented

 Recently Updated

Feedback First

The platform isn't only about votes.

Every project should encourage thoughtful feedback.

Members can:

 Leave constructive comments

 Ask questions

 Suggest improvements

 Celebrate milestones

 Follow builders

Display comment counts on every card.

Weekly Competition

Every week begins a new season.

Each season has:

Start date

End date

Live countdown

Current standings

Weekly champion

At the end of the week:

Archive results

Award badges

Crown the winner

Begin a fresh season automatically

Hall of Fame

Celebrate past winners.

Display:

Week Number

Winner

Winning Project

Votes

Screenshot

Prize

Winning Badge

Builder Profiles

Every member has a profile including:

Photo

Bio

Skills

Projects

Weekly Rank

Total Votes Received

Achievements

GitHub

LinkedIn

Portfolio

Followers

Recent Activity

Contribution Calendar

Achievements

Reward consistency instead of popularity alone.

Examples:

🚀 First Launch

🔥 On Fire

🏆 Weekly Champion

💡 Most Innovative

🤝 Community Favorite

⚡ Fast Builder

🎯 Consistent Builder

❤️ Most Helpful Reviewer

Community Feed

Real-time activity feed.

Examples:

Jane submitted StudyHub

Michael received 5 votes

Sarah commented on DevBoard

Daniel reached Rank #2

Abigail launched Portfolio V2

Keep updating automatically.

Submission Flow

Submitting a project should be simple.

Fields:

Project Name

Tagline

Description

Thumbnail

Screenshots

Demo URL

GitHub Repository

Tech Stack

Category

Development Status

Expected Launch Date

Authentication

Google

GitHub

Discord

Dashboard

Members can:

Manage projects

Track votes

Read comments

View analytics

Monitor leaderboard position

Edit profile

View achievements

Admin Panel

Approve submissions

Feature exceptional projects

Moderate comments

Manage users

Reset weekly seasons

Platform analytics

Tech Stack

Frontend:

 Next.js

 React

 TypeScript

 Tailwind CSS

 Framer Motion

Backend:

 Supabase

 PostgreSQL

 Supabase Auth

 Supabase Storage

 Supabase Realtime

The website should motivate LearnToEarn members to consistently build and share. Every interaction—from submitting a project to receiving feedback or watching your race car inch toward first place—should feel rewarding. Prioritize smooth animations, a polished retro-tech aesthetic, and a sense of friendly competition where recognition comes not just from winning, but from learning, improving, and supporting others.

strictly follow the design inspiration

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://l2e.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8cf5e713-c1c4-4caf-90a8-97fa6ea4ffd8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# Tennis Royale - System Manual

This document provides a comprehensive overview of the modernized Tennis Royale platform, detailing user-specific functionalities, system navigation, and the core logical engines that power the experience.

---

## 👥 User Roles & UI Functionality

The platform dynamically adjusts its interface based on the active user role to provide specialized tools for every stakeholder.

### 🎾 1. Player (The Athlete)
*   **Player Dashboard**: Real-time home feed showing active matches, pending invitations, and global tournament streams.
*   **Tournament Page**: Access to live scoreboards, real-time chat channels, and interactive tournament draws.
*   **Match Center**: Dedicated interface for players to submit and verify match scores after an encounter.
*   **Profile Page**: Personal career archive with dynamic stats (Wins/Losses, Elo Rating), historical match records, and "Recent Form" visualization.
*   **Account Settings**: Granular control over privacy settings, notification preferences, and professional bio.

### 🏆 2. Host (Tournament Director)
*   **Host Dashboard**: Central command center for creating and managing tournaments, overseeing registrations, and monitoring bracket progression.
*   **Court Logistics**: Real-time tool for tracking court readiness, assigned matches, and logistical bottlenecks.
*   **Registration Manager**: Interface for reviewing athlete entries, managing waitlists, and setting seed rankings.

### 🎓 3. Coach (The Mentor)
*   **Coach Hub**: Specialized portfolio for managing an athlete roster, tracking student performance across tournaments, and facilitating bulk registrations.
*   **Athlete Analytics**: Quick view of student match history and rating progression.

### ⚖️ 4. Referee (Official)
*   **Referee Hub**: Global oversight of assigned matches, shift schedules, and match finalization protocols.
*   **Scoring Interface**: A tablet-optimized, high-fidelity interface for court-side score tracking, including point-by-point updates, deuce/advantage logic, and tie-break management.

### 👷 5. Volunteer (Staff)
*   **Volunteer Hub**: Operational duty console for staff members to check-in/out of shifts, view assigned logistical tasks (e.g., "Court Side Water Supply"), and access emergency protocols.

---

## ⚙️ Additional Functionality

### 🔄 Role Switching (Management Toggle)
*   **Location**: Found in the **Bottom Sidebar Footer** (Desktop) or **Mobile Sidebar Drawer**.
*   **Function**: Users with administrative or management permissions (Host, Coach, Referee, Volunteer) can toggle between their **Professional View** (Management) and their **Athlete View** (Player). This allows staff to verify their own participation as players without needing separate accounts.

### 🧭 Dynamic Navigation
*   **Location**: Left Sidebar (Desktop) and Bottom Navigation Bar (Mobile).
*   **Function**: The navigation system automatically "morphs" based on the `activeRole`. When you switch roles, the "Tools" section updates to show the specific dashboards required for that role (e.g., switching to Referee reveals the Referee Hub).

### 🔔 Notification Center
*   **Location**: Bell icon in the Header (Top Right).
*   **Function**: Slide-over terminal for real-time system pings, match assignments, tournament directives, and community alerts.

---

## 🧠 Comprehensive Logic & Engines

The program's intelligence is distributed across several high-fidelity logical engines:

1.  **ScoringEngine (Tennis Matrix)**
    *   Handles all tennis-specific scoring rules: `0 -> 15 -> 30 -> 40 -> Deuce -> Advantage`.
    *   Managed Set outcomes, Tie-break protocols, and Match winning conditions.
2.  **BracketEngine (Synthesis)**
    *   Automated tournament draw generation (Knockout/Single Elimination).
    *   Logical seed placement and player advancement tracking through the bracket stack.
3.  **RatingService (Elo System)**
    *   Calculates player rating adjustments based on the **Elo algorithm** (Ra' = Ra + K * (Sa - Ea)).
    *   Calculates "Expected Score" and "Recent Form" matrices for every player.
4.  **VenueService (Facility Guard)**
    *   Logic for anchoring tournaments to physical venues (Clubs/Facilities).
    *   Manages court availability and physical infrastructure metadata.
5.  **ExportService (Data Portability)**
    *   Generates administrative backups and portable reports.
    *   Exports tournament brackets, standings, and match results to **CSV** or **JSON** matrices.
6.  **AuthGuard (Security)**
    *   Role-based access control and state persistent logic (via `AuthContext`).
    *   Secure route protection and token-based API synchronization.

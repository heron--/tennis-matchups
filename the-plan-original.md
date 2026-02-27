My friend is a high school tennis coach. He wants an app to have even matchups with his students. This app will track wins and losses and have the good kids play against the good kids and the less skilled kids play against people more evenly matched. So a lot of this will be an algorithm to make sure they're matched up

We're going to use React and Tailwind for this project.
We need to prioritize mobile devices for layout. That means avoiding hover based actions and such

All state should be managed in local storage. On page load, the state should be initialized from local storage

* The app should have multiple views
  * Initial view - Player Manager
  * Tournament Manager
  * Ranked Match Manager

# Navigation
There should be a hamburger menu in the top left that opens a side panel with all of the pages. Tournament Manager and ranked match manger should be disabled until you've added players (there should be a little subdued text indicating why they're disabled)

## Player Manager
This should be a list view of all of the registered players
When there are no players there should be an empty state with a big call to action with something like "Add you first players to get started."
In that empty state there should be a button that opens our "add a player modal". The modal will be a simple text input.
After a player is added, the modal should clear the input but remain open. This will allow the user to quickly add another.
When a player is added, we should show a toast saying "player succesffully added"

Players will have a ranking based on how they've done in the past. Initially all players start with an ELO of 1200

## Tournament Manager
A "tournament" is essentially a double elimination tournament bracket. Say there are 11 kids, there will be 5 matchups with 1 kid getting a bye. Then losers go to a losers bracket and the winner of the losers brack faces the winner of the winners bracket.

Clicking each matchup should open a modal to record the score (a number per player) and a way to delcare the winner

All wins and losses will count toward a player's ELO

## Ranked Match Manager
This is a system to record a single game between two players. The users selects two players, inputs the score and the winner. This is recorded and the ELO / ranking is adjussted

# Export data / clear data
Exporting data should work by generating a link with all state encoded in the user can then save that url somewhere. When the page is loaded with this specific url param, the local storage is cleared and loaded from this state if it's valid. There should be a modal warning the user before clearing the state though

To clear data there should be an option in the hamburger menu (at the bottom and red) that completely resets the local storage state. This should also have a warning.

# Style and Tone
The overall tone is an app that takes itself a little too seriously but in a fun, joking way. You can figure out what that means. We'll want it to look nice and polished



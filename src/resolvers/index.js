import Resolver from '@forge/resolver';
import api, {route} from '@forge/api';

const resolver = new Resolver();

// Get all boards
resolver.define('getAllBoards', async () => {
    try {
        // Pagination for boards
        let startAt = 0;
        let allBoards = [];
        let hasMoreBoards = true;

        while (hasMoreBoards) {
            const boardsResponse = await api.asApp().requestJira(route`/rest/agile/1.0/board?type=scrum&startAt=${startAt}`);
            const boardsPage = await boardsResponse.json();

            allBoards = [...allBoards, ...boardsPage.values];
            startAt += boardsPage.maxResults;
            hasMoreBoards = startAt < boardsPage.total;
        }

        return allBoards;
    } catch (error) {
        console.error('Error fetching boards:', error);
        return [];
    }
});

// Get sprints for a specific board
resolver.define('getSprintsForBoard', async (req) => {
    const {boardId, boardName, showClosed} = req.payload;

    try {
        // Pagination for sprints
        let startAt = 0;
        let allSprints = [];
        let hasMoreSprints = true;
        const sprintState = showClosed ? 'active,closed' : 'active';

        while (hasMoreSprints) {
            const sprintsResponse = await api.asApp().requestJira(
                route`/rest/agile/1.0/board/${boardId}/sprint?state=${sprintState}&startAt=${startAt}`
            );
            const sprintsPage = await sprintsResponse.json();

            const formattedSprints = sprintsPage.values.map(sprint => ({
                boardName: boardName,
                sprintName: sprint.name,
                goal: sprint.goal,
                state: sprint.state,
                sprintId: sprint.id
            }));

            allSprints = [...allSprints, ...formattedSprints];
            startAt += sprintsPage.maxResults;
            hasMoreSprints = startAt < sprintsPage.total;
        }

        return allSprints;
    } catch (error) {
        console.error(`Error fetching sprints for board ${boardId}:`, error);
        return [];
    }
});

export const handler = resolver.getDefinitions();

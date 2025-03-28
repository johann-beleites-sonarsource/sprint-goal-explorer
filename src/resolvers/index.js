import Resolver from '@forge/resolver';
import api, {route, storage} from '@forge/api';

const resolver = new Resolver();

// Extract implementation logic so it can be reused
const getAllBoardsImpl = async () => {
    try {
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
};

// Get all boards
resolver.define('getAllBoards', async () => {
    return await getAllBoardsImpl();
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

        // Count active and any sprints
        const activeSprints = allSprints.filter(sprint => sprint.state === 'active');

        // Store both states
        await storage.set(`board_has_active_sprints_${boardId}`, activeSprints.length > 0);
        await storage.set(`board_has_any_sprints_${boardId}`, allSprints.length > 0);

        return allSprints;
    } catch (error) {
        console.error(`Error fetching sprints for board ${boardId}:`, error);
        return [];
    }
});

resolver.define('getBoardsWithSprints', async (req) => {
    const {showClosed = false} = req.payload || {};

    try {
        const allBoards = await getAllBoardsImpl();
        const filteredBoards = [];

        for (const board of allBoards) {
            // Check the appropriate storage key based on whether we want to show closed sprints
            const storageKey = showClosed
                ? `board_has_any_sprints_${board.id}`
                : `board_has_active_sprints_${board.id}`;

            const hasSprints = await storage.get(storageKey);

            console.log("Board:", board.id, ":", hasSprints);

            // Include boards that have the right type of sprints or where it's unknown
            if (hasSprints !== false) {
                filteredBoards.push(board);
            }
        }

        console.log("filtered boards:", filteredBoards);

        return filteredBoards;
    } catch (error) {
        console.error('Error fetching boards with sprints:', error);
        return [];
    }
});

export const handler = resolver.getDefinitions();
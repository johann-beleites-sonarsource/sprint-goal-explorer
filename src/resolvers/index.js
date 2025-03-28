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

        return allSprints;
    } catch (error) {
        console.error(`Error fetching sprints for board ${boardId}:`, error);
        return [];
    }
});

// Get boards with sprints based on stored lists
resolver.define('getBoardsWithSprints', async (req) => {
    const {showClosed = false} = req.payload || {};

    try {
        // Get the list based on whether we want to show closed sprints
        const listKey = showClosed ? 'boards_with_any_sprints' : 'boards_with_active_sprints';
        const boardIdList = await storage.get(listKey) || [];

        if (boardIdList.length === 0) {
            return [];
        }

        // Get all boards and filter by IDs in our list
        const allBoards = await getAllBoardsImpl();
        return allBoards.filter(board => boardIdList.includes(board.id));
    } catch (error) {
        console.error('Error fetching boards with sprints:', error);
        return [];
    }
});

// Update the global lists of boards with sprints
resolver.define('updateBoardLists', async (req) => {
    const {boardsWithActiveSprints, boardsWithAnySprints} = req.payload;

    try {
        await storage.set('boards_with_active_sprints', boardsWithActiveSprints);
        await storage.set('boards_with_any_sprints', boardsWithAnySprints);
        return {success: true};
    } catch (error) {
        console.error('Error updating board lists:', error);
        return {success: false, error: error.message};
    }
});

export const handler = resolver.getDefinitions();
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

                // Update storage with information about whether this board has sprints
                const hasSprints = allSprints.length > 0;
                await storage.set(`board_has_sprints_${boardId}`, hasSprints);

                return allSprints;
            } catch (error) {
                console.error(`Error fetching sprints for board ${boardId}:`, error);
                return [];
            }
        });

        // Get boards that contain sprints or where it's unknown
        resolver.define('getBoardsWithSprints', async () => {
            try {
                // Call the implementation function directly instead of using resolver.invoke
                const allBoards = await getAllBoardsImpl();

                // Filter boards based on stored information
                const filteredBoards = [];

                for (const board of allBoards) {
                    const hasSprints = await storage.get(`board_has_sprints_${board.id}`);

                    // Include boards that have sprints or where it's unknown (hasSprints is null)
                    if (hasSprints !== false) {
                        filteredBoards.push(board);
                    }
                }

                return filteredBoards;
            } catch (error) {
                console.error('Error fetching boards with sprints:', error);
                return [];
            }
        });

        export const handler = resolver.getDefinitions();
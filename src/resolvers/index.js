import Resolver from '@forge/resolver';
import api, {route} from '@forge/api';

const resolver = new Resolver();

resolver.define('getActiveSprints', async (req) => {
    const { showClosed, showWithoutGoal } = req.payload || {};

    try {
        const boardsResponse = await api.asApp().requestJira(route`/rest/agile/1.0/board?type=scrum`);
        const boards = await boardsResponse.json();
        const allSprints = [];

        //const devBoards = boards.values.filter(board => board.name.includes('Mobile') || board.name.includes('IaC') || board.name.includes('Taint'));
        const devBoards = boards.values

        for (const board of devBoards) {
            // Define sprint states to fetch based on checkbox
            const sprintState = showClosed ? 'active,closed' : 'active';

            const sprintsResponse = await api.asApp().requestJira(
                route`/rest/agile/1.0/board/${board.id}/sprint?state=${sprintState}`
            );
            const sprints = await sprintsResponse.json();

            const sprintsToAdd = sprints.values;

            allSprints.push(
                ...sprintsToAdd.map(sprint => ({
                    boardName: board.name,
                    sprintName: sprint.name,
                    goal: sprint.goal,
                    state: sprint.state,
                    sprintId: sprint.id
                }))
            );
        }

        return allSprints;
    } catch (error) {
        console.error('Error fetching sprints:', error);
        return [];
    }
});

export const handler = resolver.getDefinitions();
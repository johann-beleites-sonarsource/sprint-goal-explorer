import Resolver from '@forge/resolver';
import api, {route} from '@forge/api';

const resolver = new Resolver();

resolver.define('getActiveSprints', async (req) => {
    try {
        const boardsResponse = await api.asApp().requestJira(route`/rest/agile/1.0/board?type=scrum`);
        const boards = await boardsResponse.json();
        const activeSprints = [];

        const devBoards = boards.values.filter(board => board.name.includes('Mobile') || board.name.includes('IaC') || board.name.includes('Taint'));

        for (const board of devBoards/*boards.values*/) {
            const sprintsResponse = await api.asApp().requestJira(
                route`/rest/agile/1.0/board/${board.id}/sprint?state=active`
            );
            const sprints = await sprintsResponse.json();

            activeSprints.push(
                ...sprints.values.map(sprint => ({
                    boardName: board.name,
                    sprintName: sprint.name
                }))
            );
        }

        return activeSprints;
    } catch (error) {
        console.error('Error fetching active sprints:', error);
        return [];
    }
});

export const handler = resolver.getDefinitions();
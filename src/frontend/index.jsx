import React, {useEffect, useState} from 'react';
import ForgeReconciler, {Button, Em, Label, Strong, Text, TextArea, Textfield} from '@forge/react';
import {invoke} from '@forge/bridge';

const App = () => {
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showClosedSprints, setShowClosedSprints] = useState(false);
    const [showSprintsWithoutGoal, setShowSprintsWithoutGoal] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [loadedPercent, setLoadedPercent] = useState(0);
    const [loadAllBoardsNext, setLoadAllBoardsNext] = useState(false);
    const [triggerCounter, setTriggerCounter] = useState(0);
    const [allSprintsAlreadyLoaded, setAllSprintsAlreadyLoaded] = useState(false);

    useEffect(() => {
        let isActive = true;
        const useAllBoards = loadAllBoardsNext;
        setLoadAllBoardsNext(false);

        const fetchData = async () => {
            setLoading(true);
            setSprints([]);
            setLoadedPercent(0);

            try {
                // Get boards based on parameter
                const boardsToProcess = useAllBoards
                    ? await invoke('getAllBoards')
                    : await invoke('getBoardsWithSprints', {showClosed: showClosedSprints});

                if (!isActive) return;

                let accumulatedSprints = [];
                let index = 0;

                // If we're querying all boards, track which boards have sprints
                const boardsWithActiveSprints = new Set();
                const boardsWithAnySprints = new Set();

                for (const board of boardsToProcess) {
                    if (!isActive) return;

                    const boardSprints = await invoke('getSprintsForBoard', {
                        boardId: board.id,
                        boardName: board.name,
                        showClosed: useAllBoards ? true : showClosedSprints
                    });

                    if (!isActive) return;

                    // If we're querying all boards, update our sets
                    if (useAllBoards && boardSprints.length > 0) {
                        boardsWithAnySprints.add(board.id);

                        if (boardSprints.some(sprint => sprint.state === 'active')) {
                            boardsWithActiveSprints.add(board.id);
                        }
                    }

                    // When querying all boards, filter the sprints based on current setting
                    const sprintsToAdd = useAllBoards && !showClosedSprints
                        ? boardSprints.filter(sprint => sprint.state === 'active')
                        : boardSprints;

                    accumulatedSprints = [...accumulatedSprints, ...sprintsToAdd];
                    setSprints([...accumulatedSprints]);
                    setLoadedPercent(Math.round((100 * ++index) / boardsToProcess.length));
                }

                // If we queried all boards, update the lists in storage
                if (useAllBoards) {
                    await invoke('updateBoardLists', {
                        boardsWithActiveSprints: Array.from(boardsWithActiveSprints),
                        boardsWithAnySprints: Array.from(boardsWithAnySprints)
                    });
                }

                if (isActive) {
                    setLoading(false);
                    if (showClosedSprints && !allSprintsAlreadyLoaded) {
                        setAllSprintsAlreadyLoaded(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isActive = false;
        };
    }, [triggerCounter]);

    const toggleClosedSprints = () => {
        setShowClosedSprints(!showClosedSprints);
        if (!allSprintsAlreadyLoaded) {
            setTriggerCounter(triggerCounter + 1);
        }
    };

    const toggleSprintsWithoutGoal = () => {
        setShowSprintsWithoutGoal(!showSprintsWithoutGoal);
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
    };

    const loadAllBoards = () => {
        setLoadAllBoardsNext(true);
        setTriggerCounter(triggerCounter + 1);
    };

    // Remove duplicates based on sprintId
    const uniqueSprints = sprints
        .reduce((unique, sprint) => {
            const exists = unique.some(s => s.sprintId === sprint.sprintId);
            if (!exists) {
                unique.push(sprint);
            }
            return unique;
        }, []);

    const filteredSprints = uniqueSprints.filter(sprint => {
        // Filter by goal presence
        if (!showSprintsWithoutGoal && (!sprint.goal || sprint.goal.trim() === '')) {
            return false;
        }

        if (!showClosedSprints && sprint.state === 'closed') {
            return false;
        }

        // Filter by sprint name (case insensitive)
        if (searchText && !sprint.sprintName.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }

        return true;
    });

    return (
        <>
            <Label labelFor={'searchField'}>Filter by sprint name</Label>
            <Textfield
                key={'searchField'}
                onChange={handleSearchChange}
                value={searchText}
            />
            <Button onClick={toggleClosedSprints}>
                {`${showClosedSprints ? '✓' : '□'} Show closed sprints${allSprintsAlreadyLoaded ? '' : ' (triggers reload)'}`}
            </Button>
            <Button onClick={toggleSprintsWithoutGoal}>
                {`${showSprintsWithoutGoal ? '✓' : '□'} Show sprints without goal`}
            </Button>
            <Button onClick={loadAllBoards} isDisabled={loading}>
                Re-query all boards
            </Button>
            <Text>{loading ? <>Loading {loadedPercent}%... </> : <></>} Sprints
                (showing {filteredSprints.length} of {uniqueSprints.length} loaded):</Text>

            {filteredSprints.length > 0 ? (
                <>
                    {filteredSprints.map((sprint, index) => {
                        const goalText = sprint.goal || 'No goal set';

                        return (
                            <React.Fragment key={index}>
                                <Text><Strong>{sprint.sprintName}{sprint.state === 'closed' ? ' (closed)' : ''}</Strong></Text>
                                <TextArea
                                    key={`goal-${index}`}
                                    value={goalText}
                                    isReadOnly={true}
                                    appearance={"none"}
                                />
                            </React.Fragment>
                        );
                    })}
                </>
            ) : (loading ? <></> : <Text><Em>No sprints found</Em></Text>)}
        </>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);
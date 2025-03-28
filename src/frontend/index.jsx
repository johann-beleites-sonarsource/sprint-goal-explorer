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

    useEffect(() => {
        let isActive = true;

        const fetchData = async (useAllBoards = false) => {
            setLoading(true);
            setSprints([]);
            setLoadedPercent(0);

            try {
                // Get boards based on parameter
                const boardsToProcess = useAllBoards
                    ? await invoke('getAllBoards')
                    : await invoke('getBoardsWithSprints');

                if (!isActive) return;

                let accumulatedSprints = [];
                let index = 0;
                for (const board of boardsToProcess) {
                    if (!isActive) return;

                    const boardSprints = await invoke('getSprintsForBoard', {
                        boardId: board.id,
                        boardName: board.name,
                        showClosed: showClosedSprints
                    });

                    if (!isActive) return;

                    accumulatedSprints = [...accumulatedSprints, ...boardSprints];
                    setSprints([...accumulatedSprints]);
                    setLoadedPercent(Math.round((100 * ++index) / boardsToProcess.length));
                }

                if (isActive) {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        // Initial load with just boards with sprints
        fetchData(false);

        return () => {
            isActive = false;
        };
    }, [showClosedSprints]);

    const loadAllBoards = async () => {
        setLoading(true);
        setSprints([]);
        setLoadedPercent(0);

        try {
            const allBoards = await invoke('getAllBoards');

            let accumulatedSprints = [];
            let index = 0;
            for (const board of allBoards) {
                const boardSprints = await invoke('getSprintsForBoard', {
                    boardId: board.id,
                    boardName: board.name,
                    showClosed: showClosedSprints
                });

                accumulatedSprints = [...accumulatedSprints, ...boardSprints];
                setSprints([...accumulatedSprints]);
                setLoadedPercent(Math.round((100 * ++index) / allBoards.length));
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading all boards:', error);
            setLoading(false);
        }
    };

    const toggleClosedSprints = () => {
        setShowClosedSprints(!showClosedSprints);
    };

    const toggleSprintsWithoutGoal = () => {
        setShowSprintsWithoutGoal(!showSprintsWithoutGoal);
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
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
                {`${showClosedSprints ? '✓' : '□'} Show closed sprints`}
            </Button>
            <Button onClick={toggleSprintsWithoutGoal}>
                {`${showSprintsWithoutGoal ? '✓' : '□'} Show sprints without goal`}
            </Button>
            <Button onClick={loadAllBoards} isDisabled={loading}>
                Query All Boards
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
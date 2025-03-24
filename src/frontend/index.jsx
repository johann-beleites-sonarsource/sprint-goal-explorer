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

        const fetchData = async () => {

            setLoading(true);
            setSprints([]); // Clear existing sprints
            setLoadedPercent(0);

            try {
                // First, get all boards
                const allBoards = await invoke('getAllBoards');

                // Check if this request was superseded
                if (!isActive) return;

                let accumulatedSprints = [];

                // Process each board sequentially
                let index = 0;
                for (const board of allBoards) {
                    // Check if this request was superseded
                    if (!isActive) return;

                    // Get sprints for this board
                    const boardSprints = await invoke('getSprintsForBoard', {
                        boardId: board.id,
                        boardName: board.name,
                        showClosed: showClosedSprints
                    });

                    // Check if this request was superseded
                    if (!isActive) return;

                    // Add new sprints to accumulated collection
                    accumulatedSprints = [...accumulatedSprints, ...boardSprints];

                    // Update UI after each board's sprints are processed
                    setSprints([...accumulatedSprints]);

                    // Update loading progress
                    setLoadedPercent(Math.round((100 * ++index) / allBoards.length));
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

        fetchData();

        return () => {
            isActive = false;
        };

    }, [showClosedSprints]);

    const toggleClosedSprints = () => {
        setShowClosedSprints(!showClosedSprints);
    };

    const toggleSprintsWithoutGoal = () => {
        setShowSprintsWithoutGoal(!showSprintsWithoutGoal);
    }

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
            <Text>{loading ? <>Loading {loadedPercent}%... </> : <></>} Sprints
                (showing {filteredSprints.length} of {uniqueSprints.length} loaded):</Text>

            {filteredSprints.length > 0 ? (
                <>
                    {filteredSprints.map((sprint, index) => {
                        const goalText = sprint.goal || 'No goal set';
                        const goalLines = goalText.split('\n');

                        return (
                            <React.Fragment key={index}>
                                <Text><Strong>{sprint.sprintName}{sprint.state === 'closed' ? ' (closed)' : ''}</Strong></Text>
                                {/*<Text><Em>Goal:</Em></Text>*/}
                                <TextArea
                                    key={`goal-${index}`}
                                    value={goalText}
                                    isReadOnly={true}
                                    appearance={"none"}
                                />
                                {/*goalLines.map((line, lineIndex) => (
                                    <Text key={`${index}-goal-${lineIndex}`}>&nbsp;&nbsp;&nbsp;&nbsp;{line}</Text>
                                ))*/}
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

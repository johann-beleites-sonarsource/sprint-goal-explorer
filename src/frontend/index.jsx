import React, {useEffect, useState} from 'react';
import ForgeReconciler, {Text, Strong, Em, Button, Textfield, Label, TextArea} from '@forge/react';
import {invoke} from '@forge/bridge';

const App = () => {
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showClosedSprints, setShowClosedSprints] = useState(false);
    const [showSprintsWithoutGoal, setShowSprintsWithoutGoal] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        setLoading(true);
        invoke('getActiveSprints', {showClosed: showClosedSprints})
            .then(data => {
                setSprints(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error:', error);
                setLoading(false);
            });
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

    const filteredSprints = sprints.filter(sprint => {
        // Filter by goal presence
        if (!showSprintsWithoutGoal && (!sprint.goal || sprint.goal.trim() === '')) {
            return false;
        }

        // Filter by sprint name (case insensitive)
        if (searchText && !sprint.sprintName.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }

        return true;
    })
        // Remove duplicates based on sprintId
        .reduce((unique, sprint) => {
            const exists = unique.some(s => s.sprintId === sprint.sprintId);
            if (!exists) {
                unique.push(sprint);
            }
            return unique;
        }, []);

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
            <Text>Sprints ({filteredSprints.length}/{sprints.length}):</Text>
            {loading ? (
                <Text>Loading...</Text>
            ) : filteredSprints.length > 0 ? (
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
            ) : (
                <Text><Em>No sprints found</Em></Text>
            )}
        </>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);

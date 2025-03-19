import React, {useEffect, useState, Fragment} from 'react';
import ForgeReconciler, {Text, Strong, Em} from '@forge/react';
import {invoke} from '@forge/bridge';

const App = () => {
    const [sprints, setSprints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        invoke('getActiveSprints')
            .then(data => {
                console.log(data);
                setSprints(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error:', error);
                setLoading(false);
            });
    }, []);

    console.log("Sprints: ", sprints);

    return (
        <>
            <Text>Active Sprints:</Text>
            {loading ? (
                <Text>Loading...</Text>
            ) : sprints.length > 0 ? (
                <>
                    {sprints.map((sprint, index) => {
                        const goalText = sprint.goal || 'No goal set';
                        const goalLines = goalText.split('\n');

                        return (
                            <React.Fragment key={index}>
                                <Strong>{sprint.sprintName}</Strong>
                                <Text><Em>Goal:</Em></Text>
                                {goalLines.map((line, lineIndex) => (
                                    <Text key={`${index}-goal-${lineIndex}`}>  {line}</Text>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </>
            ) : (
                <Text>No active sprints found</Text>
            )}
        </>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);

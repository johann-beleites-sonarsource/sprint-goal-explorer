import React, {useEffect, useState} from 'react';
import ForgeReconciler, {Text, Fragment} from '@forge/react';
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

    return (
        <>
            <Text>Active Sprints:</Text>
            {loading ? (
                <Text>Loading...</Text>
            ) : sprints.length > 0 ? (
                <>
                    {sprints.map((sprint, index) => (
                        <Text key={index}>
                            \- {sprint.boardName}: {sprint.sprintName}
                        </Text>
                    ))}
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
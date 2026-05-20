exports.handler = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello from my Serverless Docker Container!",
            path: event.rawPath
        }),
    };
};
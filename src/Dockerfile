# Use an official Python runtime as a parent image
FROM python:3.11-slim


# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /usr/src/app
COPY . .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn
RUN pip install gunicorn

# Expose the port the app runs on
EXPOSE $PORT

# Run the app using gunicorn in a production environment
# CMD gunicorn --bind 0.0.0.0:$PORT app:app
# CMD ["gunicorn", "-k", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", "-w", "1", "--bind", "0.0.0.0:$PORT", "myapp:app"]
# This is not a proper production setup, but it's good enough for what its being used for for now at least
CMD python app.py
# Use the official AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# We only need git now to pull that ImageNetV2 library
RUN yum install -y git && yum clean all

# Copy your requirements.txt into the container
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python dependencies using the no-cache flag
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend Python code into the container
COPY . ${LAMBDA_TASK_ROOT}

# Tell Lambda where to send the traffic
CMD [ "app.handler" ]
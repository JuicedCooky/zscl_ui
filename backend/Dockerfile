# Use the official AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y git && yum clean all

# Copy your requirements.txt into the container
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install your Python dependencies
RUN pip install -r requirements.txt

# Copy the rest of your backend Python code into the container
COPY backend.py ${LAMBDA_TASK_ROOT}

# Tell Lambda where to send the traffic. 
# (e.g., if your file is app.py and your function is 'handler')
CMD [ "app.handler" ]

# UPGRADE: Use Python 3.12, which is built on modern Amazon Linux 2023
FROM public.ecr.aws/lambda/python:3.12

# UPGRADE: AL2023 uses 'dnf' instead of 'yum'. 
# This pulls the modern GCC 11+ compilers needed for new NumPy and PyTorch builds.
RUN dnf install -y git gcc gcc-c++ python3-devel && dnf clean all

# Copy your requirements.txt into the container
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install your modern Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend Python code into the container
COPY . ${LAMBDA_TASK_ROOT}

# Tell Lambda where to send the traffic
CMD [ "backend.handler" ]
import torch

gradient = torch.load("grad_EuroSAT.pth", weights_only=False)
print(gradient.shape())
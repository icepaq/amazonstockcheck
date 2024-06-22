from PIL import Image
from amazoncaptcha import AmazonCaptcha
import sys

image = sys.argv[1]
cap = AmazonCaptcha(image)

res = cap.solve()

print(res)

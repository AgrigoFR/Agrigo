import string
import random
import os
from threading import Thread

def id_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

class Launch(Thread):
    def __init__(self, lettre):
        Thread.__init__(self)
        self.lettre = lettre

    def run(self):
        while True:
            email = id_generator() + "@gmail.com"
            cmd = 'curl --data "email='+email+'&ca=100000&siren=572015246&apport=10000&montant=500000&motif=Autre&reglement=on" localhost:8080/etape1'
            os.system(cmd)

thread_1 = Launch("1")
thread_2 = Launch("2")
thread_3 = Launch("3")
thread_4 = Launch("4")

thread_1.start()
thread_2.start()
thread_3.start()
thread_4.start()

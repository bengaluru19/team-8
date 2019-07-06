from .models import event
from django.contrib.auth.models import User,auth

def report():
    #Volunteer wise 
    s=''
    d={}
    table = User.objects.values()
    for row in table:
        
        a =  row['first_name']+' '+row['last_name']+' '+row['no_of_hrs']+'\n'
        s += a
        d[row['no_of_hrs']]=a
    
    #Returning events and its completed hours
    #Event Wise
    e=''
    event_history = event.objects.values()
    for row in event_history:
        e += row['event_name'] + (row['max_hrs']-row['rem_hrs'])+'\n'
    
    #Leader Baord
    r=''
    i = 1
    while d:
        n = max(d)
        m = d[n]
        r += str(i) + m
        d.pop(n)
    
    return s,e,r
